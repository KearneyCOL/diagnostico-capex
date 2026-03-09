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

const ACTIVE_MS = 2 * 60 * 1000;

export default function Admin() {
  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [sortBy,     setSortBy]     = useState("updated_at");
  const [sortDir,    setSortDir]    = useState("desc");
  const [now,        setNow]        = useState(Date.now());
  const [deleting,   setDeleting]   = useState(null);
  const [exporting,  setExporting]  = useState(false);
  const [toast,      setToast]      = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);

  const showToast = (msg, ok=true) => {
    setToast({msg, ok});
    setTimeout(() => setToast(null), 3500);
  };

  // Reloj cada 10s para recalcular "activo"
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Carga inicial
    supabase
      .from("dvb_assessments")
      .select("id, data, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setSessions(data);
        setLoading(false);
      });

    // Suscripción Realtime
    const channel = supabase
      .channel("dvb_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dvb_assessments" }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === "INSERT") {
          setSessions(prev => [newRow, ...prev]);
          setLiveEvents(prev => [{ id: newRow.id, type: "INSERT", ts: Date.now() }, ...prev.slice(0, 49)]);
        }
        if (eventType === "UPDATE") {
          setSessions(prev => prev.map(s => s.id === newRow.id ? newRow : s));
          setLiveEvents(prev => [{ id: newRow.id, type: "UPDATE", ts: Date.now() }, ...prev.slice(0, 49)]);
        }
        if (eventType === "DELETE") {
          setSessions(prev => prev.filter(s => s.id !== oldRow.id));
          setLiveEvents(prev => [{ id: oldRow.id, type: "DELETE", ts: Date.now() }, ...prev.slice(0, 49)]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const rows = sessions
    .map(s => ({
      ...s,
      score:    globalScore(s.data),
      pct:      Math.round((answered(s.data) / totalQ) * 100),
      isActive: (now - new Date(s.updated_at).getTime()) < ACTIVE_MS,
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
    setDeleting(id);
    const { error } = await supabase.from("dvb_assessments").delete().eq("id", id);
    setDeleting(null);
    if (error) {
      showToast(`❌ Error al eliminar "${id}": ${error.message}`, false);
    } else {
      setSessions(prev => prev.filter(s => s.id !== id));
      showToast(`✓ Registro "${id}" eliminado.`);
    }
  };

  const deleteAll = async () => {
    if (!window.confirm(`¿Eliminar TODOS los ${rows.length} registros? Esta acción no se puede deshacer.`)) return;
    setDeleting("all");
    const ids = sessions.map(s => s.id);
    const { error } = await supabase.from("dvb_assessments").delete().in("id", ids);
    setDeleting(null);
    if (error) {
      showToast(`❌ Error al eliminar: ${error.message}`, false);
    } else {
      setSessions([]);
      showToast("✓ Todos los registros eliminados.");
    }
  };

  const [showGen,  setShowGen]  = useState(false);
  const [genInput, setGenInput] = useState("");
  const [genCopied,setGenCopied]= useState(false);
  const ALL_RUBROS = ["red_movil","red_fija","transmision","nube_publica","nube_telco","it","umm","umc"];
  const RUBRO_LABELS = {red_movil:"📡 Red Móvil",red_fija:"🔌 Red Fija",transmision:"🔗 Transmisión",nube_publica:"☁️ Nube Pública",nube_telco:"🖥️ Nube Telco",it:"💻 IT",umm:"📦 UMM",umc:"🏗️ UMC"};
  const [genRubros, setGenRubros] = useState([...ALL_RUBROS]);

  const toggleGenRubro = (key) => setGenRubros(prev =>
    prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]
  );

  const genClean = genInput.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9\-_]/g,"");
  const genRubrosParam = genRubros.length > 0 && genRubros.length < ALL_RUBROS.length
    ? `&rubros=${genRubros.join(",")}` : "";
  const genUrl   = genClean ? `${window.location.origin}/?id=${genClean}${genRubrosParam}` : "";

  const exportLog = () => {
    setExporting(true);
    try {
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
    showToast("✓ Excel exportado correctamente.");
    } catch(e) {
      showToast(`❌ Error al exportar: ${e.message}`, false);
    } finally {
      setExporting(false);
    }
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

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
          background: toast.ok ? "#18181B" : "#991B1B",
          color:"white", padding:"11px 22px", borderRadius:10,
          fontSize:13, fontWeight:600, zIndex:2000,
          boxShadow:"0 4px 24px rgba(0,0,0,0.22)", whiteSpace:"nowrap",
        }}>
          {toast.msg}
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
                      <span style={{fontSize:11, fontWeight: checked ? 600 : 400, color: checked ? C.inkH : C.inkMid}}>
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
          <button onClick={exportLog} disabled={exporting} style={{
            padding:"5px 14px", borderRadius:7, border:"none",
            background: exporting ? "#A1A1AA" : C.red, color:"white", fontSize:11, fontWeight:700,
            cursor: exporting ? "default" : "pointer", fontFamily:FF,
          }}>
            {exporting ? "Exportando…" : "⬇ Descargar log Excel"}
          </button>
          <button onClick={deleteAll} disabled={deleting==="all"} style={{
            padding:"5px 14px", borderRadius:7, fontSize:11, fontWeight:700,
            cursor: deleting==="all" ? "default" : "pointer", fontFamily:FF,
            border:"1px solid #FECACA", background:"#FEF2F2", color:"#991B1B",
            opacity: deleting==="all" ? 0.6 : 1,
          }}>
            {deleting==="all" ? "Eliminando…" : "🗑 Eliminar todo"}
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
            {label:"Activas ahora",    value:rows.filter(r=>r.isActive).length, color:"#F97316"},
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
                      <div style={{display:"flex", alignItems:"center", gap:7}}>
                        {s.isActive && (
                          <span style={{
                            width:8, height:8, borderRadius:"50%", flexShrink:0,
                            background:"#22C55E", boxShadow:"0 0 0 3px #bbf7d088",
                            display:"inline-block", animation:"pulse 1.5s infinite",
                          }}/>
                        )}
                        <div>
                          <div style={{fontSize:13, fontWeight:700, color:C.ink}}>{s.id}</div>
                          <div style={{fontSize:10.5, color:C.inkSoft, marginTop:2}}>
                            Creado {new Date(s.created_at).toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"})}
                          </div>
                        </div>
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
                        <button onClick={() => deleteOne(s.id)} disabled={!!deleting} style={{
                          fontSize:11, fontWeight:600, padding:"5px 8px",
                          border:"1px solid #FECACA", borderRadius:6,
                          background:"#FEF2F2", color:"#991B1B",
                          cursor: deleting ? "default" : "pointer",
                          fontFamily:FF, flexShrink:0,
                          opacity: deleting===s.id ? 0.5 : 1,
                        }}>
                          {deleting===s.id ? "…" : "🗑"}
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

        {/* ── Live feed ── */}
        <div style={{
          marginTop:24, background:C.white, borderRadius:10,
          border:`1px solid ${C.border}`, overflow:"hidden",
        }}>
          <div style={{
            padding:"12px 20px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", gap:8,
          }}>
            <span style={{
              width:8, height:8, borderRadius:"50%", background:"#22C55E",
              boxShadow:"0 0 0 3px #bbf7d088", display:"inline-block",
              animation:"pulse 1.5s infinite",
            }}/>
            <span style={{fontSize:13, fontWeight:700, color:C.ink}}>Log en vivo</span>
            <span style={{fontSize:11, color:C.inkSoft, marginLeft:4}}>
              — cambios en tiempo real vía Supabase Realtime
            </span>
          </div>
          <div style={{maxHeight:220, overflowY:"auto", fontFamily:"'Courier New', monospace", fontSize:11.5}}>
            {liveEvents.length === 0 ? (
              <div style={{padding:"20px", color:C.inkSoft, fontSize:12}}>
                Esperando actividad… Los cambios aparecerán aquí en tiempo real.
              </div>
            ) : liveEvents.map((ev, i) => {
              const age = Math.round((Date.now() - ev.ts) / 1000);
              const ageStr = age < 60 ? `hace ${age}s` : `hace ${Math.round(age/60)}m`;
              const typeColor = ev.type==="INSERT" ? "#16A34A" : ev.type==="UPDATE" ? "#2563EB" : "#DC2626";
              const typeLabel = ev.type==="INSERT" ? "NUEVA SESIÓN" : ev.type==="UPDATE" ? "ACTUALIZACIÓN" : "ELIMINADO";
              return (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"8px 20px",
                  borderBottom: i < liveEvents.length-1 ? `1px solid ${C.borderSm}` : "none",
                  background: i===0 ? `${typeColor}08` : "transparent",
                }}>
                  <span style={{
                    fontSize:9.5, fontWeight:800, letterSpacing:"0.06em",
                    color:typeColor, background:`${typeColor}15`,
                    padding:"2px 7px", borderRadius:4, flexShrink:0,
                  }}>{typeLabel}</span>
                  <span style={{flex:1, color:C.ink, fontWeight: i===0 ? 700 : 400}}>{ev.id}</span>
                  <span style={{color:C.inkSoft, fontSize:11, flexShrink:0}}>{ageStr}</span>
                </div>
              );
            })}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html:`
          @keyframes pulse {
            0%,100% { box-shadow: 0 0 0 3px #bbf7d088; }
            50%      { box-shadow: 0 0 0 6px #86efac33; }
          }
        `}} />
      </div>
    </div>
  );
}
