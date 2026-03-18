import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { C, FF, RUBROS, CRITERIOS, wavg, lv, getRubroData } from "./shared";

const globalScore = (data) => {
  if (!data) return 0;
  const vs = RUBROS.map(r => {
    const rubroData = getRubroData(data, r.key);
    const cs = CRITERIOS.map(c => wavg(c.subs, rubroData)).filter(v=>v>0);
    return cs.length ? cs.reduce((a,b)=>a+b)/cs.length : 0;
  }).filter(v=>v>0);
  return vs.length ? vs.reduce((a,b)=>a+b)/vs.length : 0;
};
const answered = (data) => {
  if (!data) return 0;
  return RUBROS.reduce((s,r) => {
    const rubroData = getRubroData(data, r.key);
    return s + CRITERIOS.reduce((s2,c) => s2 + c.subs.filter(sq => rubroData?.[sq.id] > 0).length, 0);
  }, 0);
};
const totalQ = RUBROS.length * CRITERIOS.reduce((s,c)=>s+c.subs.length,0);

export default function Admin() {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [sortBy,   setSortBy]   = useState("updated_at"); // updated_at | score | pct
  const [sortDir,  setSortDir]  = useState("desc");

  // ── Selección múltiple ──
  const [selected, setSelected] = useState(new Set());

  // ── Modal para crear promedio ──
  const [showAvgModal, setShowAvgModal] = useState(false);
  const [avgName, setAvgName] = useState("");
  const [creatingAvg, setCreatingAvg] = useState(false);

  useEffect(() => {
    supabase
      .from("dvb_assessments")
      .select("id, data, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setSessions(data);
        setLoading(false);
      });
  }, []);

  const rows = useMemo(() => sessions
    .map(s => ({
      ...s,
      score: globalScore(s.data),
      pct:   Math.round((answered(s.data) / totalQ) * 100),
    }))
    .filter(s => s.id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "score") return (a.score - b.score) * dir;
      if (sortBy === "pct")   return (a.pct - b.pct) * dir;
      return (new Date(a.updated_at) - new Date(b.updated_at)) * dir;
    }), [sessions, search, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortIcon = ({col}) => sortBy !== col ? null : (
    <span style={{marginLeft:3, fontSize:10}}>{sortDir==="asc"?"▲":"▼"}</span>
  );

  // ── Selección ──
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map(r => r.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  // ── Crear promedio ──
  const createAverage = async () => {
    if (!avgName.trim() || selected.size < 2) return;
    
    setCreatingAvg(true);
    
    try {
      // Obtener las sesiones seleccionadas
      const selectedSessions = sessions.filter(s => selected.has(s.id));
      
      // Calcular el promedio de todas las respuestas
      // Solo para rubros que tengan datos en al menos una sesión
      const avgData = {};
      
      RUBROS.forEach(rubro => {
        // Verificar si alguna sesión tiene datos para este rubro
        const hasDataForRubro = selectedSessions.some(s => {
          const rubroData = getRubroData(s.data, rubro.key);
          return rubroData && Object.values(rubroData).some(v => v > 0);
        });
        
        // Solo procesar rubros con datos
        if (hasDataForRubro) {
          avgData[rubro.key] = {};
          
          CRITERIOS.forEach(criterio => {
            criterio.subs.forEach(sub => {
              // Obtener todos los valores para esta pregunta
              // Soportar ambas estructuras: data.ans.rubro o data.rubro
              const values = selectedSessions
                .map(s => getRubroData(s.data, rubro.key)?.[sub.id])
                .filter(v => v && v > 0);
              
              // Calcular promedio si hay valores
              if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                // Redondear al entero más cercano (1-5)
                avgData[rubro.key][sub.id] = Math.round(avg);
              }
            });
          });
        }
      });

      // Verificar que hay datos para promediar
      const hasAnyData = Object.keys(avgData).length > 0 && 
        Object.values(avgData).some(rubro => Object.keys(rubro).length > 0);
      
      if (!hasAnyData) {
        alert("No hay datos suficientes para crear un promedio. Asegúrate de que los registros seleccionados tengan respuestas.");
        setCreatingAvg(false);
        return;
      }

      // Limpiar el nombre
      const cleanName = avgName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "");
      
      // Guardar en Supabase con la estructura correcta: { ans: {...}, drivers: {...} }
      const now = new Date().toISOString();
      const payload = {
        ans: avgData,
        drivers: {},
        isAverage: true,
      };
      
      const { error } = await supabase
        .from("dvb_assessments")
        .upsert({
          id: cleanName,
          data: payload,
          created_at: now,
          updated_at: now,
        });

      if (error) throw error;

      // Abrir el nuevo registro
      window.open(`/?id=${cleanName}`, "_blank");
      
      // Limpiar estado
      setShowAvgModal(false);
      setAvgName("");
      setSelected(new Set());
      
      // Añadir la nueva sesión al estado local sin recargar todo
      setSessions(prev => [{ id: cleanName, data: payload, created_at: now, updated_at: now }, ...prev]);
      
    } catch (err) {
      console.error("Error creando promedio:", err);
      alert("Error al crear el promedio. Por favor intenta de nuevo.");
    } finally {
      setCreatingAvg(false);
    }
  };

  const deleteOne = async (id) => {
    if (!window.confirm(`¿Eliminar el registro "${id}"? Esta acción no se puede deshacer.`)) return;
    await supabase.from("dvb_assessments").delete().eq("id", id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const deleteAll = async () => {
    if (!window.confirm(`¿Eliminar TODOS los ${rows.length} registros? Esta acción no se puede deshacer.`)) return;
    await supabase.from("dvb_assessments").delete().neq("id", "");
    setSessions([]);
    setSelected(new Set());
  };

  const [showGen,  setShowGen]  = useState(false);
  const [genInput, setGenInput] = useState("");
  const [genCopied,setGenCopied]= useState(false);
  const ALL_RUBROS = useMemo(() => RUBROS.map(r => r.key), []);
  const RUBRO_LABELS = useMemo(() => Object.fromEntries(RUBROS.map(r => [r.key, `${r.icon} ${r.label}`])), []);
  const [genRubros, setGenRubros] = useState(() => RUBROS.map(r => r.key));

  const toggleGenRubro = (key) => setGenRubros(prev =>
    prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]
  );

  const genClean = genInput.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9\-_]/g,"");
  const genRubrosParam = genRubros.length > 0 && genRubros.length < ALL_RUBROS.length
    ? `&rubros=${genRubros.join(",")}` : "";
  const genUrl   = genClean ? `${window.location.origin}/?id=${genClean}${genRubrosParam}` : "";

  const exportLog = () => {
    const wb = XLSX.utils.book_new();

    // ── Hoja 1: Resumen por sesión ─────────────────────────────────────────
    const resumen = rows.map(s => ({
      "ID / Nombre":        s.id,
      "Creado":             new Date(s.created_at).toLocaleString("es-CO"),
      "Última actividad":   new Date(s.updated_at).toLocaleString("es-CO"),
      "Progreso (%)":       s.pct,
      "Score global":       s.score > 0 ? +s.score.toFixed(2) : "",
      "Nivel":              s.score > 0 ? C.L[Math.max(0,Math.min(4,Math.round(s.score)-1))].label : "Sin datos",
      ...Object.fromEntries(CRITERIOS.map(c => {
        const cs = RUBROS.map(r => wavg(c.subs, getRubroData(s.data, r.key))).filter(v=>v>0);
        const avg = cs.length ? cs.reduce((a,b)=>a+b)/cs.length : "";
        return [`Criterio ${c.num} - ${c.label}`, avg ? +avg.toFixed(2) : ""];
      })),
      ...Object.fromEntries(RUBROS.map(r => {
        const cs = CRITERIOS.map(c => wavg(c.subs, getRubroData(s.data, r.key))).filter(v=>v>0);
        const avg = cs.length ? cs.reduce((a,b)=>a+b)/cs.length : "";
        return [`Paquete - ${r.label}`, avg ? +avg.toFixed(2) : ""];
      })),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");

    // ── Hoja 2: Respuestas detalladas por sesión ───────────────────────────
    const detalle = [];
    rows.forEach(s => {
      RUBROS.forEach(r => {
        CRITERIOS.forEach(c => {
          c.subs.forEach(sq => {
            const rubroData = getRubroData(s.data, r.key);
            detalle.push({
              "ID / Nombre": s.id,
              "Última actividad": new Date(s.updated_at).toLocaleString("es-CO"),
              "Paquete": r.label,
              "Criterio": `${c.num} - ${c.label}`,
              "Pregunta ID": sq.id,
              "Respuesta (1-5)": rubroData?.[sq.id] || "",
            });
          });
        });
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), "Detalle respuestas");

    // ── Exportar ───────────────────────────────────────────────────────────
    const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
    saveAs(
      new Blob([buf], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
      `DVB_Admin_Log_${new Date().toISOString().slice(0,10)}.xlsx`
    );
  };
  const avg       = rows.length ? rows.reduce((s,r)=>s+r.score,0)/rows.length : 0;
  const completed = rows.filter(r=>r.pct===100).length;

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:FF,color:C.inkSoft,fontSize:14}}>
      Cargando sesiones…
    </div>
  );

  return (
    <div style={{minHeight:"100vh", background:C.bg, fontFamily:FF}}>

      {/* ── Modal crear promedio ── */}
      {showAvgModal && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:1000, fontFamily:FF,
        }} onClick={()=>{ if(!creatingAvg) setShowAvgModal(false); }}>
          <div style={{
            background:"white", borderRadius:14, padding:"28px 24px", width:400,
            boxShadow:"0 8px 48px rgba(0,0,0,0.2)", borderTop:`4px solid #3B82F6`,
          }} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:16, fontWeight:800, color:C.ink, margin:"0 0 6px"}}>
              📊 Crear resultado promedio
            </h2>
            <p style={{fontSize:12, color:C.inkSoft, margin:"0 0 16px", lineHeight:1.5}}>
              Se creará un nuevo registro con el promedio de las <strong>{selected.size} sesiones</strong> seleccionadas.
            </p>

            {/* Lista de seleccionados */}
            <div style={{
              background:C.bg, borderRadius:8, padding:"10px 12px",
              marginBottom:16, maxHeight:120, overflowY:"auto",
              border:`1px solid ${C.border}`,
            }}>
              <div style={{fontSize:10, color:C.inkSoft, marginBottom:6, fontWeight:600}}>
                SESIONES A PROMEDIAR:
              </div>
              {[...selected].map(id => (
                <div key={id} style={{
                  fontSize:11, color:C.inkMid, padding:"3px 0",
                  borderBottom:`1px solid ${C.borderSm}`,
                }}>
                  • {id}
                </div>
              ))}
            </div>

            {/* Input nombre */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11, fontWeight:600, color:C.ink, display:"block", marginBottom:6}}>
                Nombre del nuevo registro:
              </label>
              <input
                autoFocus
                value={avgName}
                onChange={e => setAvgName(e.target.value)}
                placeholder="ej: promedio-q1-2026, consolidado-norte..."
                disabled={creatingAvg}
                style={{
                  width:"100%", padding:"10px 12px", borderRadius:8,
                  border:`1.5px solid ${C.border}`, fontSize:13,
                  fontFamily:FF, color:C.ink, outline:"none",
                  background: creatingAvg ? C.bg : "white",
                  boxSizing:"border-box",
                }}
              />
              {avgName && (
                <div style={{fontSize:10, color:C.inkSoft, marginTop:4}}>
                  ID: <strong>{avgName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "")}</strong>
                </div>
              )}
            </div>

            {/* Botones */}
            <div style={{display:"flex", gap:8}}>
              <button
                onClick={createAverage}
                disabled={!avgName.trim() || creatingAvg}
                style={{
                  flex:1, padding:"10px", borderRadius:8, border:"none",
                  background: avgName.trim() && !creatingAvg ? "#3B82F6" : C.borderSm,
                  color:"white", fontSize:13, fontWeight:700,
                  cursor: avgName.trim() && !creatingAvg ? "pointer" : "default",
                  fontFamily:FF,
                }}
              >
                {creatingAvg ? "Creando…" : "✓ Crear y abrir"}
              </button>
              <button
                onClick={() => setShowAvgModal(false)}
                disabled={creatingAvg}
                style={{
                  padding:"10px 16px", borderRadius:8, fontFamily:FF,
                  border:`1px solid ${C.border}`, background:"white",
                  color:C.inkMid, fontSize:12, cursor: creatingAvg ? "default" : "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal generador de links ── */}
      {showGen && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:999, fontFamily:FF,
        }} onClick={()=>setShowGen(false)}>
          <div style={{
            background:"white", borderRadius:14, padding:"32px 28px", width:420,
            boxShadow:"0 8px 48px rgba(0,0,0,0.18)", borderTop:`4px solid ${C.red}`,
          }} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:16, fontWeight:800, color:C.ink, margin:"0 0 6px"}}>
              🔗 Generar link de diagnóstico
            </h2>
            <p style={{fontSize:12, color:C.inkSoft, margin:"0 0 20px", lineHeight:1.55}}>
              Elige un nombre para identificar este diagnóstico. Puedes compartir el link generado directamente con el cliente.
            </p>

            {/* Input */}
            <div style={{
              display:"flex", alignItems:"center",
              border:`1.5px solid ${C.border}`, borderRadius:8,
              overflow:"hidden", background:C.bg, marginBottom:8,
            }}>
              <span style={{
                padding:"10px 12px", fontSize:12, color:C.inkSoft,
                background:"#F4F4F2", borderRight:`1px solid ${C.border}`,
                flexShrink:0, userSelect:"none",
              }}>?id=</span>
              <input
                autoFocus
                value={genInput}
                onChange={e=>{ setGenInput(e.target.value); setGenCopied(false); }}
                placeholder="claro-colombia, nico, q2-2025…"
                style={{
                  flex:1, border:"none", outline:"none", padding:"10px 12px",
                  fontSize:13, fontFamily:FF, color:C.ink, background:"transparent",
                }}
              />
            </div>

            {/* Checklist de paquetes */}
            <div style={{marginBottom:16}}>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
                <span style={{fontSize:12, fontWeight:700, color:C.ink}}>Paquetes habilitados en el link</span>
                <div style={{display:"flex", gap:6}}>
                  <button onClick={()=>setGenRubros([...ALL_RUBROS])} style={{
                    fontSize:10, padding:"2px 8px", borderRadius:4, cursor:"pointer",
                    border:`1px solid ${C.border}`, background:"white", color:C.inkMid, fontFamily:FF,
                  }}>Todos</button>
                  <button onClick={()=>setGenRubros([])} style={{
                    fontSize:10, padding:"2px 8px", borderRadius:4, cursor:"pointer",
                    border:`1px solid ${C.border}`, background:"white", color:C.inkMid, fontFamily:FF,
                  }}>Ninguno</button>
                </div>
              </div>
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 1fr",
                gap:6, padding:"10px 12px",
                background:C.bg, borderRadius:8, border:`1px solid ${C.border}`,
              }}>
                {ALL_RUBROS.map(key => {
                  const checked = genRubros.includes(key);
                  return (
                    <label key={key} style={{
                      display:"flex", alignItems:"center", gap:7, cursor:"pointer",
                      padding:"5px 7px", borderRadius:6,
                      background: checked ? `${C.red}12` : "transparent",
                      border: `1px solid ${checked ? C.red+"44" : "transparent"}`,
                      transition:"all .15s",
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={()=>{ toggleGenRubro(key); setGenCopied(false); }}
                        style={{accentColor:C.red, width:14, height:14, cursor:"pointer", flexShrink:0}}
                      />
                      <span style={{fontSize:11, fontWeight: checked ? 600 : 400, color: checked ? C.ink : C.inkMid}}>
                        {RUBRO_LABELS[key]}
                      </span>
                    </label>
                  );
                })}
              </div>
              {genRubros.length === 0 && (
                <p style={{fontSize:11, color:"#DC2626", margin:"6px 0 0", fontWeight:600}}>
                  ⚠️ Selecciona al menos un paquete
                </p>
              )}
            </div>

            {/* Preview URL */}
            {genUrl && (
              <div style={{
                padding:"8px 12px", background:C.bg, borderRadius:7,
                border:`1px solid ${C.border}`, marginBottom:16,
                fontSize:11, color:C.inkMid, wordBreak:"break-all", lineHeight:1.5,
              }}>
                <span style={{color:C.inkSoft}}>Link: </span>
                <span style={{fontWeight:600, color:C.redH}}>{genUrl}</span>
              </div>
            )}

            {/* Buttons */}
            <div style={{display:"flex", gap:8}}>
              <button
                disabled={!genUrl || genRubros.length === 0}
                onClick={()=>{
                  navigator.clipboard.writeText(genUrl).catch(()=>{});
                  setGenCopied(true);
                }}
                style={{
                  flex:1, padding:"10px", borderRadius:8, border:"none",
                  background: genCopied ? "#16A34A" : (genUrl && genRubros.length > 0) ? C.red : C.borderSm,
                  color:"white", fontSize:13, fontWeight:700,
                  cursor: (genUrl && genRubros.length > 0) ? "pointer" : "default", fontFamily:FF,
                  transition:"background .2s",
                }}
              >
                {genCopied ? "✓ ¡Link copiado!" : "Copiar link"}
              </button>
              {genUrl && (
                <a href={genUrl} target="_blank" rel="noreferrer" style={{
                  padding:"10px 16px", borderRadius:8, fontFamily:FF,
                  border:`1px solid ${C.border}`, background:"white",
                  color:C.inkMid, fontSize:12, fontWeight:600,
                  textDecoration:"none", display:"flex", alignItems:"center",
                }}>
                  Abrir →
                </a>
              )}
              <button onClick={()=>{ setShowGen(false); setGenInput(""); setGenCopied(false); setGenRubros([...ALL_RUBROS]); }} style={{
                padding:"10px 14px", borderRadius:8, fontFamily:FF,
                border:`1px solid ${C.border}`, background:"white",
                color:C.inkMid, fontSize:12, cursor:"pointer",
              }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de selección flotante ── */}
      {selected.size > 0 && (
        <div style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background:"#1E293B", color:"white", padding:"12px 20px",
          borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,0.25)",
          display:"flex", alignItems:"center", gap:16, zIndex:100,
          fontFamily:FF,
        }}>
          <span style={{fontSize:13, fontWeight:600}}>
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <div style={{width:1, height:20, background:"rgba(255,255,255,0.2)"}}/>
          <button
            onClick={() => setShowAvgModal(true)}
            disabled={selected.size < 2}
            style={{
              padding:"8px 14px", borderRadius:8, border:"none",
              background: selected.size >= 2 ? "#3B82F6" : "#475569",
              color:"white", fontSize:12, fontWeight:700,
              cursor: selected.size >= 2 ? "pointer" : "default",
              fontFamily:FF, display:"flex", alignItems:"center", gap:6,
            }}
          >
            📊 Crear promedio
          </button>
          <button
            onClick={clearSelection}
            style={{
              padding:"8px 12px", borderRadius:8,
              border:"1px solid rgba(255,255,255,0.2)", background:"transparent",
              color:"white", fontSize:12, cursor:"pointer", fontFamily:FF,
            }}
          >
            ✕ Limpiar
          </button>
        </div>
      )}

      {/* ── Topbar ── */}
      <header style={{
        height:52, background:C.white, borderBottom:`1px solid ${C.border}`,
        borderTop:`3px solid ${C.red}`, padding:"0 28px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:50,
      }}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{fontSize:13, fontWeight:800, color:C.redH, letterSpacing:"-0.01em"}}>
            Drivers Value Budgeting
          </span>
          <div style={{width:1, height:14, background:C.borderSm}}/>
          <span style={{fontSize:11, color:C.inkSoft}}>Panel de Administración</span>
        </div>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <button onClick={()=>setShowGen(true)} style={{
            padding:"5px 14px", borderRadius:7, fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:FF,
            border:`1px solid ${C.redBorder}`, background:C.redLight, color:C.redH,
          }}>
            🔗 Generar link
          </button>
          <button onClick={exportLog} style={{
            padding:"5px 14px", borderRadius:7, border:"none",
            background:C.red, color:"white", fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:FF,
          }}>
            ⬇ Descargar log Excel
          </button>
          <button onClick={deleteAll} style={{
            padding:"5px 14px", borderRadius:7, fontSize:11, fontWeight:700,
            cursor:"pointer", fontFamily:FF,
            border:"1px solid #FECACA", background:"#FEF2F2", color:"#991B1B",
          }}>
            🗑 Eliminar todo
          </button>
          <a href="/" style={{
          padding:"5px 14px", borderRadius:7, border:`1px solid ${C.border}`,
          background:C.white, color:C.inkMid, fontSize:11, fontWeight:600,
          textDecoration:"none", cursor:"pointer",
        }}>
          ← Volver a la app
        </a>
        </div>
      </header>

      <div style={{padding:"28px 32px", maxWidth:1100, margin:"0 auto"}}>

        {/* ── Stats ── */}
        <div style={{display:"flex", gap:16, marginBottom:24}}>
          {[
            {label:"Sesiones totales", value:rows.length, color:C.red},
            {label:"Score promedio",   value:avg>0?avg.toFixed(1):"—", color:"#3B82F6"},
            {label:"Completadas 100%", value:completed, color:"#22C55E"},
            {label:"Preguntas totales",value:totalQ, color:"#EAB308"},
          ].map((s,i) => (
            <div key={i} style={{
              flex:1, background:C.white, borderRadius:10, padding:"16px 20px",
              border:`1px solid ${C.border}`,
            }}>
              <div style={{fontSize:22, fontWeight:900, color:s.color, letterSpacing:"-0.02em"}}>{s.value}</div>
              <div style={{fontSize:11, color:C.inkSoft, marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabla ── */}
        <div style={{background:C.white, borderRadius:10, border:`1px solid ${C.border}`, overflow:"hidden"}}>

          {/* Header tabla */}
          <div style={{
            padding:"14px 20px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div style={{fontSize:13, fontWeight:700, color:C.ink}}>
              {rows.length} sesión{rows.length!==1?"es":""}
            </div>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              style={{
                padding:"6px 12px", borderRadius:7, border:`1px solid ${C.border}`,
                fontSize:12, fontFamily:FF, outline:"none", width:200, color:C.ink,
              }}
            />
          </div>

          {/* Columnas */}
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:C.bg}}>
                {/* Checkbox seleccionar todo */}
                <th style={{
                  padding:"10px 12px", width:40, textAlign:"center",
                  borderBottom:`1px solid ${C.border}`,
                }}>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleSelectAll}
                    style={{accentColor:C.red, width:15, height:15, cursor:"pointer"}}
                  />
                </th>
                {[
                  {label:"Nombre / ID",    col:null,         w:"auto"},
                  {label:"Última actividad",col:"updated_at", w:160},
                  {label:"Progreso",        col:"pct",        w:120},
                  {label:"Score global",    col:"score",      w:130},
                  {label:"Nivel",           col:null,         w:110},
                  {label:"",               col:null,         w:80},
                ].map((h,i)=>(
                  <th key={i} onClick={h.col?()=>toggleSort(h.col):undefined} style={{
                    padding:"10px 16px", textAlign:"left", fontSize:10.5,
                    fontWeight:700, color:C.inkSoft, letterSpacing:"0.08em",
                    textTransform:"uppercase", width:h.w,
                    cursor:h.col?"pointer":"default",
                    userSelect:"none",
                    borderBottom:`1px solid ${C.border}`,
                  }}>
                    {h.label}<SortIcon col={h.col}/>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{padding:32, textAlign:"center", color:C.inkSoft, fontSize:13}}>
                  No hay sesiones todavía.
                </td></tr>
              )}
              {rows.map((s, i) => {
                const level = s.score > 0 ? lv(s.score) : null;
                const isSelected = selected.has(s.id);
                return (
                  <tr key={s.id} style={{
                    borderBottom:`1px solid ${C.borderSm}`,
                    background: isSelected ? "#EFF6FF" : i%2===0 ? C.white : C.bg,
                  }}>
                    {/* Checkbox */}
                    <td style={{padding:"12px 12px", textAlign:"center"}}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(s.id)}
                        style={{accentColor:C.red, width:15, height:15, cursor:"pointer"}}
                      />
                    </td>
                    {/* ID */}
                    <td style={{padding:"12px 16px"}}>
                      <div style={{fontSize:13, fontWeight:700, color:C.ink}}>{s.id}</div>
                      <div style={{fontSize:10.5, color:C.inkSoft, marginTop:2}}>
                        Creado {new Date(s.created_at).toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"})}
                      </div>
                    </td>
                    {/* Última actividad */}
                    <td style={{padding:"12px 16px", fontSize:12, color:C.inkMid}}>
                      {new Date(s.updated_at).toLocaleString("es-CO",{
                        day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"
                      })}
                    </td>
                    {/* Progreso */}
                    <td style={{padding:"12px 16px"}}>
                      <div style={{display:"flex", alignItems:"center", gap:8}}>
                        <div style={{flex:1, height:4, background:C.borderSm, borderRadius:99, overflow:"hidden"}}>
                          <div style={{height:"100%", width:`${s.pct}%`, background:s.pct===100?"#22C55E":C.red, borderRadius:99}}/>
                        </div>
                        <span style={{fontSize:11, fontWeight:600, color:C.inkMid, flexShrink:0}}>{s.pct}%</span>
                      </div>
                    </td>
                    {/* Score */}
                    <td style={{padding:"12px 16px"}}>
                      <span style={{
                        fontSize:20, fontWeight:900, color:level?level.c:C.inkFaint,
                        letterSpacing:"-0.02em",
                      }}>
                        {s.score>0?s.score.toFixed(1):"—"}
                      </span>
                      <span style={{fontSize:10, color:C.inkSoft}}>/5</span>
                    </td>
                    {/* Nivel */}
                    <td style={{padding:"12px 16px"}}>
                      {level ? (
                        <span style={{
                          fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99,
                          background:level.bg, color:level.text,
                        }}>{level.label}</span>
                      ) : <span style={{fontSize:11,color:C.inkFaint}}>Sin datos</span>}
                    </td>
                    {/* Acción */}
                    <td style={{padding:"12px 16px"}}>
                      <div style={{display:"flex", gap:6, alignItems:"center"}}>
                        <a href={`/?id=${s.id}`} style={{
                          fontSize:11, fontWeight:600, color:C.redH,
                          textDecoration:"none", padding:"5px 10px",
                          border:`1px solid ${C.redBorder}`, borderRadius:6,
                          background:C.redLight, flexShrink:0,
                        }}>
                          Ver →
                        </a>
                        <button onClick={() => deleteOne(s.id)} style={{
                          fontSize:11, fontWeight:600, padding:"5px 8px",
                          border:"1px solid #FECACA", borderRadius:6,
                          background:"#FEF2F2", color:"#991B1B",
                          cursor:"pointer", fontFamily:FF, flexShrink:0,
                        }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
