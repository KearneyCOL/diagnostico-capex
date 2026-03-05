import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ── Mismos tokens que DVB ─────────────────────────────────────────────────────
const C = {
  red:"#DA291C", redH:"#C0392B", redLight:"#FEF2F2", redBorder:"#FECACA",
  white:"#FFFFFF", bg:"#F7F6F4", border:"#E4E2DE", borderSm:"#EEECE9",
  ink:"#18181B", inkMid:"#52525B", inkSoft:"#A1A1AA", inkFaint:"#D4D4D8",
  L:[
    {c:"#EF4444",bg:"#FEF2F2",text:"#991B1B",label:"Inicial"},
    {c:"#F97316",bg:"#FFF7ED",text:"#9A3412",label:"Básico"},
    {c:"#EAB308",bg:"#FEFCE8",text:"#854D0E",label:"Definido"},
    {c:"#22C55E",bg:"#F0FDF4",text:"#166534",label:"Gestionado"},
    {c:"#3B82F6",bg:"#EFF6FF",text:"#1E40AF",label:"Optimizado"},
  ],
};
const FF = "'Segoe UI','Calibri',system-ui,sans-serif";

const RUBROS = [
  {key:"red_movil",label:"Red Móvil",icon:"📡"},
  {key:"red_fija",label:"Red Fija",icon:"🔌"},
  {key:"transmision",label:"Transmisión",icon:"🔗"},
  {key:"nube_publica",label:"Nube Pública",icon:"☁️"},
  {key:"nube_telco",label:"Nube Telco",icon:"🖥️"},
  {key:"it",label:"IT",icon:"💻"},
  {key:"umm",label:"UMM",icon:"📦"},
  {key:"umc",label:"UMC",icon:"🏗️"},
];
const CRITERIOS = [
  {num:"01",key:"alineacion",label:"Alineación",subs:[{id:"a1",p:1.2},{id:"a2",p:1.2},{id:"a3",p:1.0},{id:"a4",p:1.0},{id:"a5",p:0.9},{id:"a6",p:0.8},{id:"a7",p:0.8}]},
  {num:"02",key:"granularidad",label:"Granularidad",subs:[{id:"g1",p:1.2},{id:"g2",p:1.2},{id:"g3",p:1.1},{id:"g4",p:1.0},{id:"g5",p:1.0},{id:"g6",p:0.9},{id:"g7",p:0.9},{id:"g8",p:0.7}]},
  {num:"03",key:"aprobacion",label:"Aprobación",subs:[{id:"ap1",p:1.2},{id:"ap2",p:1.2},{id:"ap3",p:1.1},{id:"ap4",p:1.1},{id:"ap5",p:1.0},{id:"ap6",p:0.9},{id:"ap7",p:0.8}]},
  {num:"04",key:"forecast",label:"Forecast",subs:[{id:"f1",p:1.2},{id:"f2",p:1.2},{id:"f3",p:1.1},{id:"f4",p:1.0},{id:"f5",p:1.0},{id:"f6",p:0.9},{id:"f7",p:0.7}]},
  {num:"05",key:"riesgos",label:"Riesgos",subs:[{id:"r1",p:1.2},{id:"r2",p:1.1},{id:"r3",p:1.1},{id:"r4",p:1.0},{id:"r5",p:0.9},{id:"r6",p:0.8},{id:"r7",p:0.7}]},
  {num:"06",key:"gobernanza",label:"Gobernanza",subs:[{id:"go1",p:1.2},{id:"go2",p:1.2},{id:"go3",p:1.2},{id:"go4",p:1.1},{id:"go5",p:1.0},{id:"go6",p:0.9},{id:"go7",p:0.8},{id:"go8",p:0.7}]},
];
const wavg = (subs, ans) => {
  let t=0, w=0;
  subs.forEach(s => { const v=ans?.[s.id]; if(v>0){t+=v*s.p; w+=s.p;} });
  return w ? t/w : 0;
};
const globalScore = (data) => {
  if (!data) return 0;
  const vs = RUBROS.map(r => {
    const cs = CRITERIOS.map(c => wavg(c.subs, data[r.key])).filter(v=>v>0);
    return cs.length ? cs.reduce((a,b)=>a+b)/cs.length : 0;
  }).filter(v=>v>0);
  return vs.length ? vs.reduce((a,b)=>a+b)/vs.length : 0;
};
const answered = (data) => {
  if (!data) return 0;
  return RUBROS.reduce((s,r) => s + CRITERIOS.reduce((s2,c) => s2 + c.subs.filter(sq => data[r.key]?.[sq.id] > 0).length, 0), 0);
};
const totalQ = RUBROS.length * CRITERIOS.reduce((s,c)=>s+c.subs.length,0);
const lv = v => C.L[Math.max(0,Math.min(4,Math.round(v)-1))];

export default function Admin() {
  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync,   setLastSync]   = useState(null);
  const [search,     setSearch]     = useState("");
  const [sortBy,     setSortBy]     = useState("updated_at"); // updated_at | score | pct
  const [sortDir,    setSortDir]    = useState("desc");

  const fetchSessions = async (silent = false) => {
    if (!silent) setRefreshing(true);
    const { data, error } = await supabase
      .from("dvb_assessments")
      .select("id, data, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (!error && data) {
      setSessions(data);
      setLastSync(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchSessions(true);

    // Suscripción en tiempo real
    const channel = supabase
      .channel("dvb_admin_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dvb_assessments" },
        () => { fetchSessions(true); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const rows = sessions
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
    });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortIcon = ({col}) => sortBy !== col ? null : (
    <span style={{marginLeft:3, fontSize:10}}>{sortDir==="asc"?"▲":"▼"}</span>
  );

  const deleteOne = async (id) => {
    if (!window.confirm(`¿Eliminar el registro "${id}"? Esta acción no se puede deshacer.`)) return;
    await supabase.from("dvb_assessments").delete().eq("id", id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const deleteAll = async () => {
    if (!window.confirm(`¿Eliminar TODOS los ${rows.length} registros? Esta acción no se puede deshacer.`)) return;
    await supabase.from("dvb_assessments").delete().neq("id", "");
    setSessions([]);
  };

  const [showGen,  setShowGen]  = useState(false);
  const [genInput, setGenInput] = useState("");
  const [genCopied,setGenCopied]= useState(false);

  const genClean = genInput.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9\-_]/g,"");
  const genUrl   = genClean ? `${window.location.origin}/?id=${genClean}` : "";

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
        const cs = RUBROS.map(r => wavg(c.subs, s.data?.[r.key])).filter(v=>v>0);
        const avg = cs.length ? cs.reduce((a,b)=>a+b)/cs.length : "";
        return [`Criterio ${c.num} - ${c.label}`, avg ? +avg.toFixed(2) : ""];
      })),
      ...Object.fromEntries(RUBROS.map(r => {
        const cs = CRITERIOS.map(c => wavg(c.subs, s.data?.[r.key])).filter(v=>v>0);
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
            detalle.push({
              "ID / Nombre": s.id,
              "Última actividad": new Date(s.updated_at).toLocaleString("es-CO"),
              "Paquete": r.label,
              "Criterio": `${c.num} - ${c.label}`,
              "Pregunta ID": sq.id,
              "Respuesta (1-5)": s.data?.[r.key]?.[sq.id] || "",
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
                disabled={!genUrl}
                onClick={()=>{
                  navigator.clipboard.writeText(genUrl).catch(()=>{});
                  setGenCopied(true);
                }}
                style={{
                  flex:1, padding:"10px", borderRadius:8, border:"none",
                  background: genCopied ? "#16A34A" : genUrl ? C.red : C.borderSm,
                  color:"white", fontSize:13, fontWeight:700,
                  cursor: genUrl ? "pointer" : "default", fontFamily:FF,
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
              <button onClick={()=>{ setShowGen(false); setGenInput(""); setGenCopied(false); }} style={{
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
          {/* Indicador de sync */}
          {lastSync && (
            <span style={{fontSize:10.5, color:C.inkSoft}}>
              {refreshing ? "⟳ Actualizando…" : `↻ ${lastSync.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`}
            </span>
          )}
          <button
            onClick={() => fetchSessions(false)}
            disabled={refreshing}
            title="Actualizar datos"
            style={{
              padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:700,
              cursor: refreshing ? "default" : "pointer", fontFamily:FF,
              border:`1px solid ${C.border}`, background:C.white, color:C.inkMid,
              opacity: refreshing ? 0.6 : 1, transition:"opacity .2s",
            }}>
            {refreshing ? "⟳" : "↻ Actualizar"}
          </button>
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
                <tr><td colSpan={6} style={{padding:32, textAlign:"center", color:C.inkSoft, fontSize:13}}>
                  No hay sesiones todavía.
                </td></tr>
              )}
              {rows.map((s, i) => {
                const level = s.score > 0 ? lv(s.score) : null;
                return (
                  <tr key={s.id} style={{
                    borderBottom:`1px solid ${C.borderSm}`,
                    background: i%2===0 ? C.white : C.bg,
                  }}>
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
