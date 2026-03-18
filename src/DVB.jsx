import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { getIdFromUrl, setIdInUrl, loadAssessment, saveAssessment } from "./dvbStorage";
import { supabase } from "./supabaseClient";
import { C, FF, RUBROS, CRITERIOS, wavg, lv } from "./shared";
import { LOGO_COLOR, LOGO_WHITE } from "./logoAssets";

const fmt = v => v > 0 ? v.toFixed(1) : "—";

const Radar = ({ scores, size=200 }) => {
  const cx=size/2, cy=size/2, r=size*0.30, n=CRITERIOS.length;
  const ang = i => Math.PI*2*i/n - Math.PI/2;
  const gp  = f => CRITERIOS.map((_,i)=>{ const a=ang(i); return `${cx+r*f*Math.cos(a)},${cy+r*f*Math.sin(a)}`; }).join(" ");
  const vals = CRITERIOS.map(c => scores[c.key]||0);
  const dp = vals.map((v,i) => {
    const f=Math.max(v,0.04)/5, a=ang(i);
    return `${i===0?"M":"L"}${cx+r*f*Math.cos(a)},${cy+r*f*Math.sin(a)}`;
  }).join(" ")+"Z";
  return (
    <svg width={size} height={size} style={{overflow:"visible", display:"block"}}>
      {[.2,.4,.6,.8,1].map((f,i)=>(
        <polygon key={i} points={gp(f)} fill={i%2===0?"rgba(218,41,28,0.03)":"none"} stroke="#E4E2DE" strokeWidth={1}/>
      ))}
      {CRITERIOS.map((_,i)=>{ const a=ang(i); return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="#E4E2DE" strokeWidth={1}/>; })}
      <path d={dp} fill="rgba(218,41,28,0.12)" stroke="#DA291C" strokeWidth={2} strokeLinejoin="round"/>
      {vals.map((v,i)=>{ if(!v) return null; const f=v/5, a=ang(i); return <circle key={i} cx={cx+r*f*Math.cos(a)} cy={cy+r*f*Math.sin(a)} r={4} fill="#DA291C" stroke="white" strokeWidth={2}/>; })}
      {CRITERIOS.map((c,i)=>{ const a=ang(i), lx=cx+(r+28)*Math.cos(a), ly=cy+(r+28)*Math.sin(a); return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" style={{fontSize:8.5, fontWeight:700, fill:"#A1A1AA", fontFamily:"inherit"}}>{c.num}</text>; })}
    </svg>
  );
};

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
const PBar = ({ v, color=C.red, h=3 }) => (
  <div style={{height:h, background:C.borderSm, borderRadius:99, overflow:"hidden"}}>
    <div style={{height:"100%", width:`${(v/5)*100}%`, background:color, borderRadius:99, transition:"width .4s ease"}}/>
  </div>
);

// ─── LEVEL BADGE ──────────────────────────────────────────────────────────────
const Badge = ({ v, sm }) => {
  if(!v) return null;
  const l = lv(v);
  const pad = sm ? "1px 7px" : "3px 10px";
  const fs  = sm ? 10 : 11;
  return (
    <span style={{display:"inline-flex", alignItems:"center", gap:4, padding:pad, background:l.bg, color:l.text, borderRadius:4, fontSize:fs, fontWeight:700, border:`1px solid ${l.border}`, whiteSpace:"nowrap", letterSpacing:"0.01em"}}>
      <span style={{width:fs===10?5:6, height:fs===10?5:6, borderRadius:"50%", background:l.c, flexShrink:0}}/>
      {v} · {l.label}
    </span>
  );
};

// ─── SCALE CARDS — like master slide vertical columns ─────────────────────────
const ScaleCards = ({ critKey, score }) => {
  const crit = CRITERIOS.find(x=>x.key===critKey);
  return (
    <div style={{marginBottom:22}}>
      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:12}}>
        <div style={{width:3, height:14, background:C.red, borderRadius:99}}/>
        <span style={{fontSize:9.5, fontWeight:700, color:C.inkMid, textTransform:"uppercase", letterSpacing:"0.14em"}}>
          Escala de Madurez
        </span>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8}}>
        {C.L.map((lv, i) => {
          const active = score > 0 && Math.round(score) === i+1;
          return (
            <div key={i} style={{
              borderRadius:8,
              border:`1.5px solid ${active ? lv.c : lv.border}`,
              background: active ? lv.bg : C.white,
              overflow:"hidden",
              transition:"all .2s",
              boxShadow: active ? `0 0 0 3px ${lv.c}25` : "none",
            }}>
              {/* Colored header — exactly like master */}
              <div style={{background: lv.c, padding:"8px 10px", display:"flex", alignItems:"center", gap:7}}>
                <div style={{width:22, height:22, borderRadius:"50%", background:"rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                  <span style={{fontSize:12, fontWeight:900, color:"white"}}>{i+1}</span>
                </div>
                <span style={{fontSize:9.5, fontWeight:800, color:"white", textTransform:"uppercase", letterSpacing:"0.08em"}}>{lv.label}</span>
                {active && <span style={{marginLeft:"auto", fontSize:8, fontWeight:700, color:"white", background:"rgba(255,255,255,0.2)", padding:"1px 5px", borderRadius:3, flexShrink:0}}>ACTUAL</span>}
              </div>
              {/* Description */}
              <div style={{padding:"10px 10px 12px"}}>
                <p style={{fontSize:10.5, color: active ? lv.text : C.inkMid, margin:0, lineHeight:1.55}}>
                  {crit.ndesc[i]}
                </p>
              </div>
              {/* Progress dots at bottom — like master */}
              <div style={{padding:"0 10px 10px", display:"flex", gap:4}}>
                {[0,1,2,3,4].map(j => (
                  <div key={j} style={{flex:1, height:4, borderRadius:99, background: j<=i ? lv.c : C.borderSm}}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "dvb_capex_claro_v1";

const emptyAns = () => {
  const o = {};
  RUBROS.forEach(r => { o[r.key]={}; CRITERIOS.forEach(c => c.subs.forEach(s => { o[r.key][s.id]=0; })); });
  return o;
};

const genId = () => crypto.randomUUID
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16);
    });

export default function DVB() {
  // ── URL params ─────────────────────────────────────────────────────────────
  const ACTIVE_RUBROS = useMemo(() => {
    const rubrosParam = new URLSearchParams(window.location.search).get("rubros");
    const allowed = rubrosParam
      ? RUBROS.filter(r => rubrosParam.split(",").map(s=>s.trim()).includes(r.key))
      : RUBROS;
    return allowed.length > 0 ? allowed : RUBROS;
  }, []);

  const [ans,        setAns]        = useState(emptyAns);
  const [drivers,    setDrivers]    = useState(() => { // texto abierto por paquete
    const o = {}; RUBROS.forEach(r => { o[r.key] = ""; }); return o;
  });
  const setDriver = (rk, v) => setDrivers(p => ({...p, [rk]: v}));
  const [rubro,      setRubro]      = useState(ACTIVE_RUBROS[0].key);
  const [tab,        setTab]        = useState("intro");
  const [exp,        setExp]        = useState(CRITERIOS[0].key);
  const [mounted,    setMounted]    = useState(false);
  const [hydrated,   setHydrated]   = useState(false);

  // ── Supabase ──────────────────────────────────────────────────────────────
  const [assessId,   setAssessId]   = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [copied,     setCopied]     = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [inputId,    setInputId]    = useState("");
  const [idError,    setIdError]    = useState("");
  const [viewers,    setViewers]    = useState(1);
  const [bFilter,    setBFilter]    = useState("all"); // filtro tab brechas // contador de presencia
  const [rFilter,    setRFilter]    = useState("all"); // filtro tab resumen
  const [introRubro, setIntroRubro] = useState(ACTIVE_RUBROS[0]?.key ?? "red_movil"); // paquete seleccionado en intro
  const [instrOpen,  setInstrOpen]  = useState(false); // instrucciones desplegables
  const saveTimer    = useRef(null);
  const channelRef   = useRef(null);
  const contentRef   = useRef(null);

  // Presence — se activa cuando ya tenemos assessId
  useEffect(() => {
    if (!assessId) return;
    // Crea un canal por diagnóstico
    const channel = supabase.channel(`presence:${assessId}`, {
      config: { presence: { key: genId() } }, // ID único por pestaña
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setViewers(Object.keys(state).length);
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [assessId]);

  // Al montar: si hay ID en URL carga ese diagnóstico, si no muestra el modal
  useEffect(() => {
    setMounted(true);
    const urlId = getIdFromUrl();
    const hydrate = (payload) => {
      if (!payload) return;
      if (payload.ans) {
        const base = emptyAns();
        Object.entries(payload.ans).forEach(([k, v]) => {
          if (base[k] !== undefined) base[k] = { ...base[k], ...v };
        });
        setAns(base);
      }
      if (payload.drivers) setDrivers(payload.drivers);
    };
    const fromLS = () => {
      try { const s = localStorage.getItem(STORAGE_KEY); if (s) hydrate(JSON.parse(s)); } catch {}
    };
    if (urlId) {
      setAssessId(urlId);
      loadAssessment(urlId)
        .then(data => { if (data) hydrate(data); else fromLS(); })
        .catch(() => fromLS())
        .finally(() => setHydrated(true));
    } else {
      fromLS();
      setShowModal(true);
      setHydrated(true);
    }
  }, []);

  // Confirmar ID elegido
  const confirmId = () => {
    const clean = inputId.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "");
    if (!clean || clean.length < 2) { setIdError("Mínimo 2 caracteres (letras, números, guiones)"); return; }
    setAssessId(clean);
    setIdInUrl(clean);
    setShowModal(false);
    setIdError("");
  };

  // Guarda en localStorage + Supabase (payload unificado con ans + drivers)
  useEffect(() => {
    if (!hydrated) return;
    const payload = { ans, drivers };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
    if (!assessId) return;
    clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await saveAssessment(assessId, payload);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } catch { setSaveStatus("error"); }
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [ans, drivers, hydrated, assessId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const set  = (rk,sid,v) => setAns(p => ({...p, [rk]: {...p[rk], [sid]:v}}));
  const cs   = useCallback((rk,ck) => wavg(CRITERIOS.find(c=>c.key===ck).subs, ans[rk]), [ans]);
  const rs   = useCallback((rk)    => { const vs=CRITERIOS.map(c=>cs(rk,c.key)).filter(v=>v>0); return vs.length ? vs.reduce((a,b)=>a+b)/vs.length : 0; }, [cs]);

  const SHOWN_RUBROS = useMemo(() => {
    if (!hydrated) return ACTIVE_RUBROS;
    const withData = ACTIVE_RUBROS.filter(r => rs(r.key) > 0);
    return withData.length > 0 ? withData : ACTIVE_RUBROS;
  }, [hydrated, ACTIVE_RUBROS, rs]);

  const cg   = useCallback((ck)    => { const vs=SHOWN_RUBROS.map(r=>cs(r.key,ck)).filter(v=>v>0); return vs.length ? vs.reduce((a,b)=>a+b)/vs.length : 0; }, [cs, SHOWN_RUBROS]);
  const gs   = useMemo(()=>{ const vs=SHOWN_RUBROS.map(r=>rs(r.key)).filter(v=>v>0); return vs.length ? vs.reduce((a,b)=>a+b)/vs.length : 0; }, [rs, SHOWN_RUBROS]);

  const totA = SHOWN_RUBROS.reduce((s,r)=>s+CRITERIOS.reduce((s2,c)=>s2+c.subs.filter(sq=>ans[r.key]?.[sq.id]>0).length,0),0);
  const totQ = SHOWN_RUBROS.length * CRITERIOS.reduce((s,c)=>s+c.subs.length, 0);
  const pct  = Math.round((totA/totQ)*100);
  const ar   = SHOWN_RUBROS.find(r=>r.key===rubro) || SHOWN_RUBROS[0];
  const arSc = rs(rubro);
  const rSc  = useMemo(()=>{ const o={}; CRITERIOS.forEach(c=>{o[c.key]=cs(rubro,c.key);}); return o; }, [cs,rubro]);

  const TABS = [{k:"intro",l:"Introducción"},{k:"detail",l:"Diagnóstico"},{k:"heatmap",l:"Heatmap"},{k:"resumen",l:"Resumen"},{k:"brechas",l:"Brechas & Roadmap"}];


  // ── Modal de ID personalizado ─────────────────────────────────────────────
  if (showModal) return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:FF, zIndex:999,
    }}>
      <div style={{
        background:"white", borderRadius:14, padding:"36px 32px", width:420,
        boxShadow:"0 8px 48px rgba(0,0,0,0.18)",
        borderTop:`4px solid ${C.red}`,
      }}>
        {/* Logo */}
        <img src={LOGO_COLOR} alt="Claro" style={{height:22, width:"auto", display:"block", marginBottom:18}}/>

        <h2 style={{fontSize:18, fontWeight:800, color:C.ink, margin:"0 0 6px", letterSpacing:"-0.02em"}}>
          Nuevo diagnóstico
        </h2>
        <p style={{fontSize:13, color:C.inkMid, margin:"0 0 22px", lineHeight:1.55}}>
          Elige un nombre corto para identificar este diagnóstico.<br/>
          Este nombre aparecerá en el link para compartir.
        </p>

        {/* Input */}
        <div style={{marginBottom:6}}>
          <div style={{
            display:"flex", alignItems:"center",
            border:`1.5px solid ${idError ? "#FCA5A5" : C.border}`,
            borderRadius:8, overflow:"hidden", background:C.bg,
            transition:"border .15s",
          }}>
            <span style={{
              padding:"10px 12px", fontSize:12, color:C.inkSoft,
              background:C.bgStripe, borderRight:`1px solid ${C.border}`,
              flexShrink:0, userSelect:"none",
            }}>
              ?id=
            </span>
            <input
              autoFocus
              value={inputId}
              onChange={e => { setInputId(e.target.value); setIdError(""); }}
              onKeyDown={e => e.key === "Enter" && confirmId()}
              placeholder="claro-colombia, nicolas, q1-2025…"
              style={{
                flex:1, border:"none", outline:"none", padding:"10px 12px",
                fontSize:13, fontFamily:FF, background:"transparent", color:C.ink,
              }}
            />
          </div>
          {idError && <div style={{fontSize:11, color:"#DC2626", marginTop:5}}>{idError}</div>}
          {inputId && !idError && (
            <div style={{fontSize:11, color:C.inkSoft, marginTop:5}}>
              Link: <span style={{color:C.redH, fontWeight:600}}>
                {window.location.origin}/?id={inputId.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9\-_]/g,"")}
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{display:"flex", gap:10, marginTop:22}}>
          <button
            onClick={confirmId}
            style={{
              flex:1, padding:"11px", borderRadius:8, border:"none",
              background:C.red, color:"white", fontSize:13, fontWeight:700,
              cursor:"pointer", fontFamily:FF,
            }}
          >
            Crear diagnóstico →
          </button>
          <button
            onClick={() => {
              const id = genId();
              setAssessId(id); setIdInUrl(id); setShowModal(false);
            }}
            style={{
              padding:"11px 14px", borderRadius:8, fontFamily:FF,
              border:`1px solid ${C.border}`, background:"white",
              color:C.inkMid, fontSize:12, cursor:"pointer",
            }}
          >
            Aleatorio
          </button>
        </div>
      </div>
    </div>
  );

  const exportExcel = () => {

    const rows = [];
    SHOWN_RUBROS.forEach(r => {
      CRITERIOS.forEach(c => {
        c.subs.forEach(sq => {
          rows.push({
            Rubro: r.label,
            Criterio: `${c.num} - ${c.label}`,
            Pregunta: sq.t,
            Respuesta: ans[r.key]?.[sq.id] || "",
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Respuestas");

    const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `DVB_Diagnostico_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

const resetAll = () => {
  const ok = window.confirm("¿Seguro que quieres reiniciar todas las respuestas?");
  if (!ok) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  const o = emptyAns();
  const d = {}; ACTIVE_RUBROS.forEach(r => { d[r.key] = ""; });
  setAns(o);
  setDrivers(d);
  if (assessId) saveAssessment(assessId, { ans: o, drivers: d }).catch(()=>{});
  setTab("intro");
};

  return (
    <div style={{display:"flex", minHeight:"100vh", fontFamily:FF, background:C.bg, color:C.ink, opacity:mounted?1:0, transition:"opacity .25s"}}>

      {/* ═══════════════════════════════════ SIDEBAR ═══ */}
      <aside style={{
        width:248, flexShrink:0,
        background:C.white,
        borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column",
        position:"sticky", top:0, height:"100vh", overflowY:"auto",
      }}>

        {/* BRAND — logo + project name */}
        <div style={{padding:"18px 18px 16px", borderBottom:`3px solid ${C.red}`, background:C.white}}>
          {/* Real Claro logo PNG — red on white, perfect as-is */}
          <img src={LOGO_COLOR} alt="Claro" style={{height:22, width:"auto", display:"block", marginBottom:10}}/>
          <div style={{display:"flex", alignItems:"center", gap:6}}>
            <div style={{width:2, height:28, background:C.red, borderRadius:99, flexShrink:0}}/>
            <div>
              <div style={{fontSize:11, fontWeight:800, color:C.ink, lineHeight:1.25, letterSpacing:"-0.01em"}}>Drivers Value Budgeting</div>
              <div style={{fontSize:9.5, fontWeight:500, color:C.inkSoft, marginTop:1, letterSpacing:"0.01em"}}>Diagnóstico de Madurez CAPEX</div>
            </div>
          </div>
        </div>

        {/* PROGRESS */}
        <div style={{padding:"13px 18px", borderBottom:`1px solid ${C.borderSm}`}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6}}>
            <span style={{fontSize:9.5, fontWeight:600, color:C.inkSoft, textTransform:"uppercase", letterSpacing:"0.1em"}}>Progreso</span>
            <span style={{fontSize:14, fontWeight:800, color:pct===100?C.L[3].c:C.red}}>{pct}%</span>
          </div>
          <PBar v={pct*5/100} color={C.red} h={4}/>
          <div style={{marginTop:5, fontSize:9.5, color:C.inkSoft}}>{totA} / {totQ} preguntas</div>
        </div>

        {/* SCORE GLOBAL */}
        <div style={{padding:"13px 18px", borderBottom:`1px solid ${C.borderSm}`}}>
          <div style={{fontSize:9, fontWeight:600, color:C.inkSoft, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4}}>Madurez Global</div>
          <div style={{display:"flex", alignItems:"baseline", gap:3}}>
            <span style={{fontSize:40, fontWeight:900, color:gs>0?C.red:C.borderSm, lineHeight:1, letterSpacing:"-0.04em"}}>{fmt(gs)}</span>
            <span style={{fontSize:13, color:C.inkFaint}}>/5.0</span>
          </div>
          {gs>0 && <div style={{marginTop:5}}><Badge v={Math.round(gs)} sm/></div>}
        </div>

        {/* TABS */}
        <div style={{padding:"10px 10px 4px"}}>
          {TABS.map(({k,l}) => (
            <button key={k} onClick={()=>{setTab(k);contentRef.current?.scrollTo({top:0,behavior:"smooth"});}} style={{
              width:"100%", padding:"8px 10px",
              border:"none", borderRadius:6,
              background: tab===k ? C.redLight : "transparent",
              borderLeft: tab===k ? `3px solid ${C.red}` : "3px solid transparent",
              color: tab===k ? C.redH : C.inkMid,
              fontSize:12, fontWeight: tab===k ? 700 : 500,
              cursor:"pointer", transition:"all .15s", fontFamily:FF,
              textAlign:"left", marginBottom:2, display:"block",
            }}>{l}</button>
          ))}
        </div>

        {/* RUBRO NAV */}
        {tab==="detail" && (
          <nav style={{flex:1, padding:"6px 10px", overflowY:"auto"}}>
            <div style={{fontSize:9, fontWeight:700, color:C.inkFaint, textTransform:"uppercase", letterSpacing:"0.14em", padding:"0 4px", marginBottom:5}}>Paquete CAPEX</div>
            {ACTIVE_RUBROS.map(r => {
              const sc=rs(r.key), isA=r.key===rubro;
              const qa=CRITERIOS.reduce((s,c)=>s+c.subs.filter(sq=>ans[r.key]?.[sq.id]>0).length,0);
              return (
                <div key={r.key} onClick={()=>setRubro(r.key)} style={{
                  display:"flex", alignItems:"center", gap:8, padding:"7px 8px",
                  borderRadius:6, cursor:"pointer",
                  background: isA ? C.redLight : "transparent",
                  borderLeft: isA ? `3px solid ${C.red}` : "3px solid transparent",
                  marginBottom:1, transition:"all .15s",
                }}>
                  <span style={{fontSize:14, flexShrink:0}}>{r.icon}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:12, fontWeight:isA?700:500, color:isA?C.redH:C.inkMid, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{r.label}</div>
                    <div style={{fontSize:9, color:C.inkSoft}}>{qa}/{CRITERIOS.reduce((s,c)=>s+c.subs.length,0)}</div>
                  </div>
                  {sc>0 && <span style={{flexShrink:0, fontSize:11, fontWeight:700, color:lv(Math.round(sc)).text, background:lv(Math.round(sc)).bg, border:`1px solid ${lv(Math.round(sc)).border}`, padding:"1px 6px", borderRadius:4}}>{sc.toFixed(1)}</span>}
                </div>
              );
            })}
          </nav>
        )}
        {tab!=="detail" && <div style={{flex:1}}/>}

        <div style={{padding:"14px 18px 16px", borderTop:`1px solid ${C.borderSm}`}}>
          <div style={{fontSize:8.5, color:C.inkFaint, marginBottom:10, letterSpacing:"0.04em"}}>
            Desarrollado por
          </div>
          {/* Kearney wordmark — SVG vectorial fiel al logo oficial post-2020 */}
          <svg viewBox="0 0 200 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:100, height:"auto", display:"block", marginBottom:8}}>
            <text
              x="0" y="24"
              fontFamily="'Helvetica Neue','Arial',sans-serif"
              fontSize="26"
              fontWeight="500"
              letterSpacing="4"
              fill="#1A1A1A"
            >KEARNEY</text>
          </svg>
          <div style={{fontSize:8, color:C.inkFaint, letterSpacing:"0.04em", lineHeight:1.6}}>
            DVB · 6 criterios · 8 paquetes<br/>Madurez CAPEX 2026
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════ MAIN ═══ */}
      <main style={{flex:1, display:"flex", flexDirection:"column", minWidth:0}}>

        {/* TOPBAR */}
        <header style={{
          height:52, background:C.white,
          borderBottom:`1px solid ${C.border}`,
          borderTop:`3px solid ${C.red}`,
          padding:"0 28px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:50,
        }}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            {/* Logo: red on white – no filter */}
            <img src={LOGO_COLOR} alt="Claro" style={{height:19, width:"auto", flexShrink:0, display:"block"}}/>
            <div style={{width:1, height:20, background:C.border, flexShrink:0}}/>
            <span style={{fontSize:12.5, fontWeight:700, color:C.redH, letterSpacing:"-0.01em"}}>Drivers Value Budgeting</span>
            <div style={{width:1, height:14, background:C.borderSm, flexShrink:0}}/>
            <span style={{fontSize:11, color:C.inkSoft, fontWeight:400}}>Diagnóstico de Madurez CAPEX</span>
            {tab==="detail" && <>
              <span style={{color:C.borderSm, fontSize:14, lineHeight:1}}>›</span>
              <span style={{fontSize:11.5, fontWeight:600, color:C.ink}}>{ar.icon} {ar.label}</span>
              {arSc>0 && <Badge v={Math.round(arSc)} sm/>}
            </>}
          </div>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            {/* Paquete switcher dropdown */}
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 4px 4px 10px",borderRadius:7,border:`1px solid ${C.border}`,background:C.white}}>
              <span style={{fontSize:11,color:C.inkSoft,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>📦</span>
              <select value={rubro} onChange={e=>{setRubro(e.target.value);if(tab==="detail"||tab==="intro"){}else setTab("detail");}} style={{
                border:"none",outline:"none",fontSize:12,fontWeight:700,
                color:C.redH,background:"transparent",cursor:"pointer",fontFamily:FF,paddingRight:4,
              }}>
                {ACTIVE_RUBROS.map(r=><option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
              </select>
            </div>

            {/* Save status */}
            <div style={{fontSize:11, color:
              saveStatus==="saving" ? C.inkSoft :
              saveStatus==="saved"  ? "#16A34A" :
              saveStatus==="error"  ? "#DC2626" : "transparent",
              display:"flex", alignItems:"center", gap:4, minWidth:90, transition:"color .3s",
            }}>
              {saveStatus==="saving" && <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin 1s linear infinite"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Guardando…</>}
              {saveStatus==="saved"  && <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Guardado</>}
              {saveStatus==="error"  && "⚠ Error"}
            </div>

            <div style={{width:1, height:14, background:C.borderSm}}/>
            <span style={{fontSize:11, color:C.inkSoft}}>{totA}/{totQ} · {pct}%</span>
            <div style={{width:60, height:3, background:C.borderSm, borderRadius:99, overflow:"hidden"}}>
              <div style={{height:"100%", width:`${pct}%`, background:C.red, borderRadius:99}}/>
            </div>
            <div style={{width:1, height:14, background:C.borderSm}}/>

            {/* Contador de personas viendo */}
            <div style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"5px 10px", borderRadius:7,
              background: viewers > 1 ? "#FEF9C3" : C.bgStripe,
              border:`1px solid ${viewers > 1 ? "#FDE047" : C.borderSm}`,
              fontSize:11, fontWeight:600,
              color: viewers > 1 ? "#854D0E" : C.inkSoft,
              transition:"all .3s",
            }}>
              {/* Dot parpadeante */}
              <div style={{
                width:6, height:6, borderRadius:"50%",
                background: viewers > 1 ? "#EAB308" : C.inkFaint,
                animation: viewers > 1 ? "pulse 1.5s infinite" : "none",
              }}/>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
              {viewers} {viewers === 1 ? "viendo" : "viendo"}
            </div>

            {/* Compartir */}
            <button onClick={copyLink} style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"6px 11px", borderRadius:7,
              background: copied ? "#F0FDF4" : C.redLight,
              border:`1px solid ${copied ? "#BBF7D0" : C.redBorder}`,
              color: copied ? "#16A34A" : C.redH,
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FF, transition:"all .2s",
            }}>
              {copied
                ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>¡Copiado!</>
                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Compartir</>
              }
            </button>

            {/* Reiniciar */}
            <button onClick={resetAll} style={{
              padding:"6px 11px", background:"white", color:C.redH,
              border:`1px solid ${C.border}`, borderRadius:7,
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FF,
            }}>Reiniciar</button>

            {/* Descargar Excel */}
            <button onClick={exportExcel} style={{
              padding:"6px 11px", background:C.red, color:"white",
              border:"none", borderRadius:7,
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FF,
            }}>⬇ Excel</button>

          </div>
        </header>

        {/* CONTENT */}
        <div ref={contentRef} style={{flex:1, overflowY:"auto", padding:"28px 32px"}}>

          {/* ══════════════════════════ INTRO ══ */}
          {tab==="intro" && (
            <div style={{maxWidth:900}}>

              {/* ── Banner paquetes restringidos ── */}
              {ACTIVE_RUBROS.length < RUBROS.length && (
                <div style={{
                  background:"#FEF3C7", border:"1.5px solid #F59E0B",
                  borderRadius:10, padding:"10px 16px", marginBottom:16,
                  display:"flex", alignItems:"center", gap:10,
                }}>
                  <span style={{fontSize:16}}>🔒</span>
                  <div>
                    <span style={{fontSize:12, fontWeight:700, color:"#92400E"}}>
                      Este link está habilitado solo para {ACTIVE_RUBROS.length} paquete{ACTIVE_RUBROS.length!==1?"s":""}:
                    </span>
                    <span style={{fontSize:12, color:"#78350F", marginLeft:6}}>
                      {ACTIVE_RUBROS.map(r=>`${r.icon} ${r.label}`).join(" · ")}
                    </span>
                  </div>
                </div>
              )}

              {/* ── Hero ── */}
              <div style={{
                borderRadius:12, overflow:"hidden", marginBottom:20,
                boxShadow:"0 4px 28px rgba(0,0,0,0.12)",
                display:"grid", gridTemplateColumns:"260px 1fr",
              }}>
                {/* Panel rojo */}
                <div style={{background:`linear-gradient(160deg,#C8281C 0%,#A81E14 100%)`, padding:"28px 24px", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden"}}>
                  <div style={{position:"absolute",top:-40,right:-40,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
                  <div style={{position:"absolute",bottom:10,left:-25,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.03)"}}/>
                  <img src={LOGO_WHITE} alt="Claro" style={{height:26, width:"auto", display:"block", marginBottom:18}}/>
                  <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:10}}>Drivers Value Budgeting</div>
                  <h1 style={{fontSize:19,fontWeight:800,color:"white",margin:"0 0 4px",lineHeight:1.25,letterSpacing:"-0.01em"}}>Diagnóstico de Madurez</h1>
                  <h2 style={{fontSize:16,fontWeight:400,fontStyle:"italic",color:"rgba(255,255,255,0.7)",margin:"0 0 16px"}}>Construcción de CAPEX</h2>
                  <div style={{width:24,height:2,background:C.gold,borderRadius:99,marginBottom:14}}/>
                  <p style={{fontSize:11,color:"rgba(255,255,255,0.5)",margin:0,lineHeight:1.6}}>8 Paquetes · 6 Criterios<br/>5 Niveles · 48 Preguntas</p>
                  <div style={{marginTop:"auto",paddingTop:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                    {SHOWN_RUBROS.map(r=>(
                      <div key={r.key} onClick={()=>{setRubro(r.key);setTab("detail");contentRef.current?.scrollTo({top:0,behavior:"smooth"});}} style={{background:"rgba(0,0,0,0.18)",borderRadius:5,padding:"5px 7px",fontSize:9.5,fontWeight:600,color:"rgba(255,255,255,0.8)",cursor:"pointer",border:"1px solid rgba(255,255,255,0.1)",textAlign:"center"}}>
                        {r.icon} {r.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel blanco — objetivo */}
                <div style={{background:C.white, padding:"28px 30px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:3,height:14,background:C.red,borderRadius:99}}/>
                    <div style={{fontSize:9.5,fontWeight:700,color:C.inkSoft,textTransform:"uppercase",letterSpacing:"0.14em"}}>Objetivo del diagnóstico</div>
                  </div>
                  <p style={{fontSize:13,color:C.ink,lineHeight:1.7,margin:"0 0 16px"}}>
                    Este diagnóstico evalúa <strong>cómo se construye el presupuesto CAPEX</strong> en cada paquete tecnológico de Claro Colombia, identificando el nivel de madurez actual en 6 dimensiones clave del proceso de planeación de inversiones.
                  </p>
                  <p style={{fontSize:12.5,color:C.inkMid,lineHeight:1.65,margin:"0 0 18px"}}>
                    No evalúa qué se invierte ni cuánto — evalúa <em>cómo se decide, estima, documenta y controla</em> esa inversión. El resultado es un mapa claro de dónde está hoy el proceso y cuáles son las oportunidades de mayor impacto para mejorar la precisión, trazabilidad y gobernanza del CAPEX.
                  </p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,paddingTop:14,borderTop:`1px solid ${C.borderSm}`}}>
                    {[["6","Criterios"],["5","Niveles"],["8","Paquetes"],["48","Preguntas"]].map(([n,l])=>(
                      <div key={l} style={{textAlign:"center"}}>
                        <div style={{fontSize:26,fontWeight:900,color:C.red,lineHeight:1}}>{n}</div>
                        <div style={{fontSize:9,color:C.inkSoft,letterSpacing:"0.08em",marginTop:3,textTransform:"uppercase"}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:18,padding:"12px 16px",borderRadius:8,background:C.bgStripe,border:`1px solid ${C.borderSm}`,display:"flex",flexDirection:"column",alignItems:"center",gap:6,textAlign:"center"}}>
                    <span style={{fontSize:13,color:C.inkMid,lineHeight:1.5}}>
                      Desplázate para revisar los <strong style={{color:C.ink}}>criterios</strong>, la <strong style={{color:C.ink}}>escala de calificación</strong> y cómo empezar
                    </span>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      <span style={{fontSize:14,color:C.red}}>↓</span>
                      <span style={{fontSize:12,color:C.red,opacity:0.5}}>↓</span>
                      <span style={{fontSize:10,color:C.red,opacity:0.25}}>↓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Instructivo ── */}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:18,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",overflow:"hidden"}}>
                <div
                  onClick={()=>setInstrOpen(o=>!o)}
                  style={{padding:"16px 22px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",userSelect:"none",background:instrOpen?C.redLight:C.white,borderLeft:instrOpen?`4px solid ${C.red}`:"4px solid transparent",transition:"all .15s"}}
                >
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                    <h2 style={{fontSize:14,fontWeight:800,margin:0}}>¿Cómo completar el diagnóstico?</h2>
                    <span style={{fontSize:11,color:C.inkSoft,fontStyle:"italic",marginLeft:4}}>Cuestionario individual o taller en grupo</span>
                  </div>
                  <span style={{color:C.inkSoft,fontSize:12,transform:instrOpen?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}>▾</span>
                </div>

                {instrOpen && (
                <div style={{padding:"0 22px 20px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,paddingTop:16}}>

                  {/* Modalidad 1: Individual */}
                  <div style={{borderRadius:10,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>
                    <div style={{background:C.redH,padding:"11px 16px",display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:20}}>🧑‍💻</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:800,color:"white"}}>Modalidad A — Cuestionario Individual</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.65)"}}>Tiempo estimado: 30–45 min por paquete</div>
                      </div>
                    </div>
                    <div style={{padding:"14px 16px"}}>
                      {[
                        {n:"1", t:"Quién lo completa", d:"El responsable directo de construir el presupuesto de cada paquete tecnológico: el líder de planeación financiera o el responsable técnico del área. Una persona por paquete."},
                        {n:"2", t:"Cómo navegar", d:"Use el menú lateral para seleccionar el paquete que va a evaluar. Dentro de cada paquete, expanda los 6 criterios uno por uno y responda todas las preguntas antes de pasar al siguiente."},
                        {n:"3", t:"Cómo calificar", d:"Lea cada pregunta y seleccione el nivel (1–5) que mejor describe cómo opera ese proceso HOY. Si no existe el proceso, seleccione 1. Si existe pero es informal, seleccione 2. Sea honesto: el diagnóstico solo es útil si refleja la realidad."},
                        {n:"4", t:"Drivers por paquete", d:"En el criterio de Granularidad, hay un campo de texto libre para describir los drivers que usan actualmente para estimar el presupuesto de ese paquete (ej. cantidad de nodos, km de fibra, tickets). Complételo con el mayor detalle posible."},
                        {n:"5", t:"Guardar y compartir", d:"El diagnóstico se guarda automáticamente. Use 'Compartir' en la barra superior para enviar el link a otro participante o para retomarlo desde otro dispositivo."},
                      ].map((s,i,arr)=>(
                        <div key={i} style={{display:"flex",gap:10,paddingBottom:i<arr.length-1?12:0,marginBottom:i<arr.length-1?12:0,borderBottom:i<arr.length-1?`1px solid ${C.borderSm}`:"none"}}>
                          <div style={{width:22,height:22,borderRadius:"50%",background:C.redLight,border:`1px solid ${C.redBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                            <span style={{fontSize:10,fontWeight:900,color:C.redH}}>{s.n}</span>
                          </div>
                          <div>
                            <div style={{fontSize:11.5,fontWeight:700,color:C.ink,marginBottom:2}}>{s.t}</div>
                            <p style={{fontSize:11,color:C.inkMid,margin:0,lineHeight:1.6}}>{s.d}</p>
                          </div>
                        </div>
                      ))}
                      <div style={{marginTop:12,padding:"9px 12px",background:"#FFFBEB",borderRadius:7,border:"1px solid #FDE68A"}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#92400E"}}>💡 Recomendación: </span>
                        <span style={{fontSize:11,color:"#92400E"}}>Complete primero el paquete que mejor conoce para calibrar la escala. Eso le dará un marco de referencia para evaluar los demás paquetes con consistencia.</span>
                      </div>
                    </div>
                  </div>

                  {/* Modalidad 2: Taller */}
                  <div style={{borderRadius:10,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>
                    <div style={{background:"#1E3A5F",padding:"11px 16px",display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:20}}>👥</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:800,color:"white"}}>Modalidad B — Taller en Grupo</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.65)"}}>Tiempo estimado: 90–120 min por sesión</div>
                      </div>
                    </div>
                    <div style={{padding:"14px 16px"}}>
                      {[
                        {n:"1", t:"Quiénes participan", d:"El taller debe reunir a los tres roles clave del equipo de tecnología: Planeación (dueño del presupuesto y los drivers), Ingeniería (responsable de los estimados técnicos y las especificaciones) e Implementación (ejecutor del proyecto, con visión real de costos y tiempos). Sin los tres, el diagnóstico estará sesgado."},
                        {n:"2", t:"Preparación previa", d:"El facilitador genera un link por paquete desde el Admin (🔗 Generar link) y lo comparte antes de la sesión. Se recomienda que cada participante lea las preguntas del criterio de su área con anticipación: Planeación revisa Granularidad y Forecast; Ingeniería revisa Alineación y Riesgos; Implementación revisa Aprobación y Gobernanza."},
                        {n:"3", t:"Dinámica del taller", d:"Proyecte el diagnóstico en pantalla y lean cada pregunta en voz alta. Antes de calificar, cada rol da su perspectiva: Planeación desde el proceso documental, Ingeniería desde la viabilidad técnica, Implementación desde lo que ocurre en campo. Si hay desacuerdo, el nivel correcto es el más bajo con evidencia real, no el promedio."},
                        {n:"4", t:"Foco de la discusión", d:"La pregunta clave para cada criterio es: '¿Tenemos evidencia de que este proceso opera así hoy — un documento, un reporte, una acta?' Si la evidencia existe solo en Planeación pero Implementación no la usa, el nivel no puede ser 4 ni 5. La brecha entre lo que se diseña y lo que se ejecuta en campo es el hallazgo más valioso del ejercicio."},
                        {n:"5", t:"Al terminar el taller", d:"Revisen juntos el Heatmap y el tab de Brechas & Roadmap. Identifiquen las brechas donde Planeación, Ingeniería e Implementación tienen perspectivas distintas — esas diferencias son exactamente los puntos de mayor fricción en la construcción del presupuesto y los candidatos prioritarios para el plan de acción."},
                      ].map((s,i,arr)=>(
                        <div key={i} style={{display:"flex",gap:10,paddingBottom:i<arr.length-1?12:0,marginBottom:i<arr.length-1?12:0,borderBottom:i<arr.length-1?`1px solid ${C.borderSm}`:"none"}}>
                          <div style={{width:22,height:22,borderRadius:"50%",background:"#EFF6FF",border:"1px solid #BFDBFE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                            <span style={{fontSize:10,fontWeight:900,color:"#1E3A5F"}}>{s.n}</span>
                          </div>
                          <div>
                            <div style={{fontSize:11.5,fontWeight:700,color:C.ink,marginBottom:2}}>{s.t}</div>
                            <p style={{fontSize:11,color:C.inkMid,margin:0,lineHeight:1.6}}>{s.d}</p>
                          </div>
                        </div>
                      ))}
                      <div style={{marginTop:12,padding:"9px 12px",background:"#EFF6FF",borderRadius:7,border:"1px solid #BFDBFE"}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#1E3A5F"}}>💡 Recomendación: </span>
                        <span style={{fontSize:11,color:"#1E3A5F"}}>Organice las sesiones por bloque tecnológico: sesión 1 con el equipo de Radio (Red Móvil + Transmisión), sesión 2 con el equipo de Fija y Acceso (Red Fija + UMM + UMC), sesión 3 con el equipo de Plataformas (Nube Pública + Nube Telco + IT). Cada bloque trae contextos distintos que enriquecen el diagnóstico.</span>
                      </div>
                    </div>
                  </div>

                </div>
                </div>
                )}
              </div>

              {/* ── 6 Criterios ── */}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:18,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                  <h2 style={{fontSize:14,fontWeight:800,margin:0}}>¿Qué evalúa el diagnóstico?</h2>
                  <span style={{fontSize:11,color:C.inkSoft,fontStyle:"italic",marginLeft:4}}>6 criterios aplicados a cada paquete de CAPEX</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {CRITERIOS.map(c=>(
                    <div key={c.key} style={{borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                      <div style={{background:C.redH,padding:"7px 11px",display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:22,height:22,borderRadius:4,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:10,fontWeight:900,color:"white"}}>{c.num}</span>
                        </div>
                        <span style={{fontSize:11.5,fontWeight:700,color:"white",flex:1}}>{c.label}</span>
                        <span style={{fontSize:14}}>{c.icon}</span>
                      </div>
                      <div style={{padding:"9px 11px 11px"}}>
                        <p style={{fontSize:11,color:C.inkMid,margin:0,lineHeight:1.5}}>{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Escala ── */}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:18,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                  <h2 style={{fontSize:14,fontWeight:800,margin:0}}>Escala de calificación — 5 niveles</h2>
                </div>
                <div style={{display:"flex",gap:7}}>
                  {C.L.map((l,i)=>(
                    <div key={i} style={{flex:1,borderRadius:8,border:`1.5px solid ${l.border}`,overflow:"hidden"}}>
                      <div style={{background:l.c,padding:"7px 10px",display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(255,255,255,0.22)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:11,fontWeight:900,color:"white"}}>{i+1}</span>
                        </div>
                        <span style={{fontSize:9.5,fontWeight:800,color:"white",textTransform:"uppercase",letterSpacing:"0.07em"}}>{l.label}</span>
                      </div>
                      <div style={{padding:"8px 10px",background:l.bg}}>
                        <p style={{fontSize:10.5,color:l.text,margin:0,lineHeight:1.5}}>{
                          i===0?"No existe el proceso. Las decisiones son ad-hoc y no hay documentación ni responsables.":
                          i===1?"El proceso existe pero es informal, inconsistente o depende de personas clave sin respaldo institucional.":
                          i===2?"El proceso está documentado, es repetible y se aplica de forma consistente en la mayoría de los casos.":
                          i===3?"El proceso se mide con KPIs activos, tiene revisión periódica y genera acciones correctivas.":
                          "El proceso mejora continuamente, está institucionalizado y se usa como referencia interna."
                        }</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,padding:"10px 14px",background:C.bgStripe,borderRadius:7,border:`1px solid ${C.borderSm}`}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.ink}}>Criterio clave para calificar: </span>
                  <span style={{fontSize:11,color:C.inkMid}}>Califique el proceso <strong>tal como opera hoy</strong>, no como debería operar ni como está planificado. Si el proceso existe en papel pero no se aplica consistentemente, el nivel correcto es 1 o 2.</span>
                </div>
              </div>

              {/* CTA */}
              {/* ── Selector de paquete ── */}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:18,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                    <h2 style={{fontSize:14,fontWeight:800,margin:0}}>¿Por dónde quieres comenzar?</h2>
                    <span style={{fontSize:11,color:C.inkSoft,fontStyle:"italic",marginLeft:4}}>Selecciona el paquete a diagnosticar</span>
                  </div>
                  {(() => {
                    const r = SHOWN_RUBROS.find(r=>r.key===introRubro) || SHOWN_RUBROS[0];
                    return (
                      <button onClick={()=>{setRubro(introRubro);setTab("detail");contentRef.current?.scrollTo({top:0,behavior:"smooth"});}} style={{
                        padding:"8px 20px",borderRadius:8,border:"none",
                        background:C.red,color:"white",fontSize:12,fontWeight:700,
                        cursor:"pointer",fontFamily:FF,display:"flex",alignItems:"center",gap:6,
                      }}>
                        Ir a {r?.icon} {r?.label} →
                      </button>
                    );
                  })()}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                  {SHOWN_RUBROS.map(r => {
                    const sc=rs(r.key);
                    const qa=CRITERIOS.reduce((s,c)=>s+c.subs.filter(sq=>ans[r.key]?.[sq.id]>0).length,0);
                    const qtot=CRITERIOS.reduce((s,c)=>s+c.subs.length,0);
                    const pctR=Math.round((qa/qtot)*100);
                    const l=sc>0?lv(Math.round(sc)):null;
                    const isSelected = introRubro===r.key;
                    return (
                      <div key={r.key}
                        onClick={(e)=>{
                          const y = window.scrollY;
                          setIntroRubro(r.key);
                          setRubro(r.key);
                          requestAnimationFrame(()=>window.scrollTo({top:y,behavior:"instant"}));
                        }}
                        style={{
                          borderRadius:10,cursor:"pointer",overflow:"hidden",
                          border:`2px solid ${isSelected?C.red:sc>0?l.border:C.border}`,
                          background:isSelected?C.redLight:sc>0?l.bg:"white",
                          transition:"all .18s",
                          boxShadow:isSelected?"0 4px 16px rgba(218,41,28,0.18)":"0 1px 4px rgba(0,0,0,0.06)",
                        }}
                        onMouseEnter={e=>{if(!isSelected){e.currentTarget.style.borderColor=C.red;e.currentTarget.style.boxShadow="0 4px 12px rgba(218,41,28,0.12)";}}}
                        onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.borderColor=sc>0?l.border:C.border;e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)";}}}
                      >
                        <div style={{height:4,background:isSelected?C.red:sc>0?l.c:C.borderSm}}/>
                        <div style={{padding:"12px 14px 14px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                            <span style={{fontSize:26}}>{r.icon}</span>
                            {isSelected && <span style={{fontSize:9,fontWeight:800,color:C.redH,background:C.redLight,border:`1px solid ${C.redBorder}`,padding:"2px 7px",borderRadius:99}}>Seleccionado</span>}
                          </div>
                          <div style={{fontSize:12.5,fontWeight:800,color:isSelected?C.redH:C.ink,marginBottom:3,lineHeight:1.2}}>{r.label}</div>
                          <div style={{fontSize:10,color:C.inkSoft,lineHeight:1.45,marginBottom:10}}>{r.sub}</div>
                          <div style={{height:3,background:C.borderSm,borderRadius:99,overflow:"hidden",marginBottom:5}}>
                            <div style={{height:"100%",width:`${pctR}%`,background:isSelected?C.red:sc>0?l.c:C.borderSm,borderRadius:99}}/>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:9.5,color:C.inkSoft}}>{qa}/{qtot} · {pctR}%</span>
                            {sc>0
                              ? <span style={{fontSize:10,fontWeight:700,color:l.c,background:l.bg,border:`1px solid ${l.border}`,padding:"1px 6px",borderRadius:4}}>{sc.toFixed(1)} {l.label}</span>
                              : <span style={{fontSize:10,color:C.inkSoft}}>Sin respuestas</span>
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{display:"flex",justifyContent:"center",gap:10,paddingBottom:4}}>
                <button onClick={()=>{setTab("detail");contentRef.current?.scrollTo({top:0,behavior:"smooth"});}} style={{padding:"11px 30px",background:C.red,color:"white",border:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FF,letterSpacing:"0.02em"}}>
                  Comenzar Diagnóstico →
                </button>
                <button onClick={()=>{setTab("heatmap");contentRef.current?.scrollTo({top:0,behavior:"smooth"});}} style={{padding:"11px 22px",background:C.white,color:C.redH,border:`1.5px solid ${C.border}`,borderRadius:7,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FF}}>
                  Ver Heatmap
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════ DIAGNÓSTICO ══ */}
          {tab==="detail" && (
            <div style={{maxWidth:920}}>

              {/* Rubro header */}
              <div style={{background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:"20px 24px", marginBottom:18, boxShadow:"0 1px 8px rgba(0,0,0,0.05)", display:"flex", gap:24, alignItems:"center", flexWrap:"wrap"}}>
                <div style={{flex:1, minWidth:260}}>
                  <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
                    <span style={{fontSize:28}}>{ar.icon}</span>
                    <div>
                      <h1 style={{fontSize:20, fontWeight:800, margin:0, letterSpacing:"-0.01em"}}>{ar.label}</h1>
                      <p style={{fontSize:11, color:C.inkSoft, margin:0}}>{ar.sub}</p>
                    </div>
                    {arSc>0 && <div style={{marginLeft:4}}><Badge v={Math.round(arSc)}/></div>}
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px 20px"}}>
                    {CRITERIOS.map(c => { const sc=cs(rubro,c.key); return (
                      <div key={c.key} style={{cursor:"pointer"}} onClick={()=>setExp(c.key)}>
                        <div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}>
                          <span style={{fontSize:10, color:C.inkMid, fontWeight:600}}>{c.num} · {c.label.split(" ")[0]}</span>
                          <span style={{fontSize:10, fontWeight:700, color:sc>0?lv(Math.round(sc)).c:C.inkFaint}}>{fmt(sc)}</span>
                        </div>
                        <PBar v={sc} color={sc>0?lv(Math.round(sc)).c:C.borderSm}/>
                      </div>
                    ); })}
                  </div>
                </div>
                <div style={{flexShrink:0}}>
                  <Radar scores={rSc} size={196}/>
                </div>
              </div>

              {/* Criterio accordion */}
              {CRITERIOS.map(crit => {
                const csc = cs(rubro, crit.key);
                const isOpen = exp === crit.key;
                const aH = crit.subs.filter(sq=>ans[rubro]?.[sq.id]>0).length;
                return (
                  <div key={crit.key} style={{
                    background:C.white, borderRadius:10, marginBottom:8,
                    border:`1px solid ${isOpen ? C.red+"66" : C.border}`,
                    overflow:"hidden", transition:"border-color .2s",
                    boxShadow: isOpen ? `0 2px 16px rgba(218,41,28,0.08)` : "none",
                  }}>
                    {/* Row header */}
                    <div onClick={()=>setExp(isOpen?null:crit.key)} style={{
                      padding:"12px 18px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:12,
                      background: isOpen ? C.redLight : C.white,
                      borderLeft: isOpen ? `4px solid ${C.red}` : "4px solid transparent",
                      transition:"all .15s", userSelect:"none",
                    }}>
                      <div style={{width:30, height:30, borderRadius:6, background:isOpen?C.red:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s"}}>
                        <span style={{fontSize:11, fontWeight:900, color:isOpen?"white":C.inkMid}}>{crit.num}</span>
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap"}}>
                          <span style={{fontSize:13.5, fontWeight:700}}>{crit.icon} {crit.label}</span>
                          {csc>0 && <Badge v={Math.round(csc)} sm/>}
                          <span style={{marginLeft:"auto", fontSize:10, color:C.inkSoft}}>{aH}/{crit.subs.length} resp.</span>
                        </div>
                        <div style={{display:"flex", alignItems:"center", gap:10}}>
                          <div style={{flex:1}}><PBar v={csc} color={csc>0?lv(Math.round(csc)).c:C.borderSm}/></div>
                          <span style={{fontSize:12, fontWeight:700, color:csc>0?lv(Math.round(csc)).c:C.inkFaint, width:22, textAlign:"right", flexShrink:0}}>{fmt(csc)}</span>
                        </div>
                      </div>
                      <span style={{color:C.inkSoft, fontSize:11, transform:isOpen?"rotate(180deg)":"none", transition:"transform .2s", flexShrink:0}}>▾</span>
                    </div>

                    {isOpen && (
                      <div style={{borderTop:`1px solid ${C.borderSm}`, padding:"18px 18px 22px"}}>

                        {/* Definition + vinculación */}
                        <div style={{display:"flex", gap:20, padding:"12px 14px", background:C.bgStripe, borderRadius:8, marginBottom:20, flexWrap:"wrap"}}>
                          <div style={{flex:1, minWidth:200}}>
                            <div style={{fontSize:9, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:4}}>Definición</div>
                            <p style={{fontSize:12, color:C.inkMid, margin:0, lineHeight:1.6}}>{crit.desc}</p>
                          </div>
                          <div style={{borderLeft:`1px solid ${C.border}`, paddingLeft:20, minWidth:160}}>
                            <div style={{fontSize:9, fontWeight:700, color:C.inkSoft, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:4}}>Vinculación DVB</div>
                            <p style={{fontSize:11, color:C.inkSoft, margin:0, lineHeight:1.6, fontStyle:"italic"}}>{crit.vinc}</p>
                          </div>
                        </div>

                        {/* ── ESCALA PRIMERO (like master vertical columns) ── */}
                        <ScaleCards critKey={crit.key} score={csc}/>

                        {/* ── PREGUNTAS DESPUÉS ── */}
                        <div style={{borderTop:`1px solid ${C.borderSm}`, paddingTop:18}}>
                          <div style={{fontSize:9.5, fontWeight:700, color:C.inkMid, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:14}}>
                            Preguntas de Diagnóstico
                          </div>
                          {crit.subs.map((sq,idx) => {
                            const val=ans[rubro]?.[sq.id], l=val>0?lv(val):null;
                            return (
                              <div key={sq.id} style={{
                                marginBottom:12, padding:"12px 14px",
                                background: val>0 ? l.bg : C.bgStripe,
                                borderRadius:8,
                                border:`1px solid ${val>0 ? l.border : C.borderSm}`,
                                transition:"all .2s",
                              }}>
                                <div style={{display:"flex", gap:10, marginBottom:10, alignItems:"flex-start"}}>
                                  <div style={{width:20, height:20, borderRadius:"50%", background:val>0?l.c:C.borderSm, color:"white", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1}}>{idx+1}</div>
                                  <p style={{fontSize:13, fontWeight:500, margin:0, lineHeight:1.6, flex:1, color:C.ink}}>{sq.t}</p>
                                  {val>0 && <Badge v={val} sm/>}
                                </div>
                                {/* 5 level buttons */}
                                <div style={{display:"flex", gap:6, marginLeft:30}}>
                                  {C.L.map((nv,i) => {
                                    const sel = val === i+1;
                                    return (
                                      <button key={i} onClick={()=>set(rubro,sq.id,i+1)} title={`${i+1} – ${nv.label}: ${crit.ndesc[i]}`} style={{
                                        flex:1, padding:"8px 4px",
                                        border:`1.5px solid ${sel ? nv.c : C.border}`,
                                        borderRadius:7,
                                        background: sel ? nv.bg : C.white,
                                        cursor:"pointer", transition:"all .15s",
                                        fontFamily:FF, textAlign:"center",
                                      }}>
                                        <div style={{fontSize:15, fontWeight:900, color:sel?nv.c:C.inkFaint, lineHeight:1}}>{i+1}</div>
                                        <div style={{fontSize:9, fontWeight:700, color:sel?nv.text:C.inkSoft, marginTop:2, lineHeight:1.2}}>{nv.label}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* ── PREGUNTA ABIERTA DE DRIVERS (solo Granularidad) ── */}
                        {crit.key === "granularidad" && (
                          <div style={{
                            marginTop:16, padding:"14px 16px",
                            background:C.bgStripe, borderRadius:8,
                            border:`1px solid ${C.border}`,
                          }}>
                            <div style={{fontSize:9.5, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:8}}>
                              🔍 Drivers utilizados en este paquete
                            </div>
                            <p style={{fontSize:12.5, color:C.inkMid, margin:"0 0 10px", lineHeight:1.55}}>
                              ¿Qué drivers o variables utilizan actualmente para estimar el presupuesto CAPEX de <strong>{ar.label}</strong>? (ej. cantidad de nodos, km de fibra, tickets proyectados, crecimiento de tráfico…)
                            </p>
                            <textarea
                              value={drivers[rubro] || ""}
                              onChange={e => setDriver(rubro, e.target.value)}
                              placeholder="Describe los drivers que usan hoy para construir el presupuesto de este paquete…"
                              rows={3}
                              style={{
                                width:"100%", boxSizing:"border-box",
                                padding:"10px 12px", borderRadius:7,
                                border:`1.5px solid ${drivers[rubro] ? C.red+"66" : C.border}`,
                                fontSize:12.5, fontFamily:FF, color:C.ink,
                                background:"white", resize:"vertical", outline:"none",
                                lineHeight:1.6, transition:"border .2s",
                              }}
                            />
                            {drivers[rubro] && (
                              <div style={{fontSize:10, color:"#16A34A", marginTop:4}}>✓ Guardado automáticamente</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════ HEATMAP ══ */}
          {tab==="heatmap" && (
            <div style={{maxWidth:1180}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:12}}>
                <div>
                  <h2 style={{fontSize:18, fontWeight:800, margin:"0 0 4px", letterSpacing:"-0.02em"}}>Heatmap de Madurez CAPEX</h2>
                  <p style={{fontSize:12, color:C.inkMid, margin:0}}>6 Criterios × 8 Paquetes · Clic en una celda para ir al diagnóstico</p>
                </div>
                <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                  {C.L.map((l,i) => (
                    <div key={i} style={{display:"flex", alignItems:"center", gap:4, padding:"3px 8px", background:l.bg, border:`1px solid ${l.border}`, borderRadius:4, fontSize:10, fontWeight:700, color:l.text}}>
                      <span style={{width:6, height:6, borderRadius:"50%", background:l.c}}/>{i+1} {l.label}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{borderRadius:10, overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,0.07)", border:`1px solid ${C.border}`}}>
                <table style={{borderCollapse:"collapse", width:"100%", background:C.white, tableLayout:"fixed"}}>
                  <thead>
                    <tr style={{background:C.redH}}>
                      <th style={{padding:"11px 14px", color:"white", fontSize:11, fontWeight:700, textAlign:"left", width:140}}>Paquete</th>
                      {CRITERIOS.map(c => (
                        <th key={c.key} style={{padding:"9px 6px", color:"white", fontSize:9, fontWeight:600, textAlign:"center", width:90}}>
                          <div style={{fontSize:14, marginBottom:2}}>{c.icon}</div>
                          <div style={{fontWeight:800, fontSize:10}}>{c.num}</div>
                          <div style={{opacity:.7, fontWeight:400, lineHeight:1.3, fontSize:8.5}}>{c.label.split(" ")[0]}</div>
                        </th>
                      ))}
                      <th style={{padding:"9px 6px", color:"white", fontSize:10, fontWeight:700, textAlign:"center", width:80, background:"rgba(0,0,0,0.18)"}}>Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHOWN_RUBROS.map((r,i) => {
                      const sc=rs(r.key);
                      return (
                        <tr key={r.key} style={{background:i%2===0?C.white:C.bgStripe}}>
                          <td onClick={()=>{setRubro(r.key);setTab("detail");contentRef.current?.scrollTo({top:0,behavior:"smooth"});}} style={{padding:"10px 14px", fontSize:12, fontWeight:600, borderBottom:`1px solid ${C.borderSm}`, cursor:"pointer", whiteSpace:"nowrap"}}>
                            {r.icon} {r.label}
                          </td>
                          {CRITERIOS.map(c => {
                            const v=cs(r.key,c.key), l=v>0?lv(Math.round(v)):null;
                            return (
                              <td key={c.key} onClick={()=>{setRubro(r.key);setExp(c.key);setTab("detail");contentRef.current?.scrollTo({top:0,behavior:"smooth"});}} style={{
                                padding:"9px 6px", textAlign:"center",
                                borderBottom:`1px solid ${C.borderSm}`,
                                background: v>0 ? l.bg+"cc" : "transparent",
                                cursor:"pointer",
                              }}>
                                {v>0 ? <div>
                                  <div style={{fontSize:15, fontWeight:900, color:l.c, lineHeight:1}}>{v.toFixed(1)}</div>
                                  <div style={{fontSize:8.5, color:l.text, fontWeight:600, opacity:.85}}>{l.label}</div>
                                </div> : <span style={{color:C.borderSm, fontSize:16}}>—</span>}
                              </td>
                            );
                          })}
                          <td style={{padding:"9px 6px", textAlign:"center", borderBottom:`1px solid ${C.borderSm}`, background:C.bgStripe}}>
                            {sc>0 ? <div>
                              <div style={{fontSize:16, fontWeight:900, color:lv(Math.round(sc)).c}}>{sc.toFixed(1)}</div>
                              <div style={{fontSize:9, color:lv(Math.round(sc)).text, fontWeight:600}}>{lv(Math.round(sc)).label}</div>
                            </div> : <span style={{color:C.borderSm}}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{background:C.redLight}}>
                      <td style={{padding:"10px 14px", fontSize:11, fontWeight:700, color:C.redH}}>Promedio Criterio</td>
                      {CRITERIOS.map(c => { const v=cg(c.key), l=v>0?lv(Math.round(v)):null; return (
                        <td key={c.key} style={{padding:"9px 6px", textAlign:"center"}}>
                          {v>0 ? <span style={{fontSize:14, fontWeight:900, color:l.c}}>{v.toFixed(1)}</span> : <span style={{color:C.borderSm}}>—</span>}
                        </td>
                      ); })}
                      <td style={{padding:"9px 6px", textAlign:"center"}}>
                        <span style={{fontSize:16, fontWeight:900, color:C.red}}>{fmt(gs)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p style={{fontSize:11, color:C.inkSoft, marginTop:10}}>Clic en cualquier celda para ir al diagnóstico detallado de ese criterio.</p>
            </div>
          )}

          {/* ══════════════════════════ RESUMEN ══ */}
          {tab==="resumen" && (() => {
            // Scores filtrados por paquete o globales
            const rubroFilt = rFilter === "all" ? null : SHOWN_RUBROS.find(r=>r.key===rFilter);
            const csFilt  = (c) => rFilter==="all" ? cg(c) : cs(rFilter, c);
            const gsFilt  = rFilter==="all" ? gs : rs(rFilter);


            return (
            <div style={{maxWidth:900}}>

              {/* Encabezado + filtro */}
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
                <div>
                  <h2 style={{fontSize:18,fontWeight:800,margin:"0 0 3px",letterSpacing:"-0.02em"}}>Resumen Ejecutivo · Drivers Value Budgeting</h2>
                  <p style={{fontSize:12,color:C.inkMid,margin:0}}>
                    {rFilter==="all" ? "Vista consolidada — todos los paquetes" : `Paquete: ${rubroFilt?.icon} ${rubroFilt?.label}`}
                  </p>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button onClick={()=>setRFilter("all")} style={{
                    padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FF,
                    border:`1.5px solid ${rFilter==="all"?C.red:C.border}`,
                    background:rFilter==="all"?C.redLight:C.white,
                    color:rFilter==="all"?C.redH:C.inkMid,
                  }}>🏢 General</button>
                  {SHOWN_RUBROS.map(r=>(
                    <button key={r.key} onClick={()=>setRFilter(r.key)} style={{
                      padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FF,
                      border:`1.5px solid ${rFilter===r.key?C.red:C.border}`,
                      background:rFilter===r.key?C.redLight:C.white,
                      color:rFilter===r.key?C.redH:C.inkMid,
                    }}>{r.icon} {r.label}</button>
                  ))}
                </div>
              </div>

              {/* Score card */}
              <div style={{borderRadius:12,overflow:"hidden",marginBottom:20,boxShadow:"0 2px 20px rgba(0,0,0,0.09)",display:"grid",gridTemplateColumns:"200px 1fr"}}>
                <div style={{background:C.redH,padding:"28px 24px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <img src={LOGO_WHITE} alt="Claro" style={{height:22, width:"auto", display:"block", marginBottom:14}}/>
                  <div style={{fontSize:8.5,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.14em",textAlign:"center",marginBottom:6}}>
                    {rFilter==="all" ? "Madurez Global" : rubroFilt?.label}
                  </div>
                  <div style={{fontSize:52,fontWeight:900,color:gsFilt>0?"white":"rgba(255,255,255,0.15)",lineHeight:1,letterSpacing:"-0.04em"}}>{fmt(gsFilt)}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}>/5.0</div>
                  {gsFilt>0 && <div style={{marginTop:10,background:"rgba(255,255,255,0.15)",borderRadius:4,padding:"3px 10px",fontSize:11,fontWeight:700,color:"white"}}>{lv(Math.round(gsFilt)).label}</div>}
                </div>
                <div style={{background:C.white,padding:"24px 28px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                  {gsFilt > 0 ? (
                    <>
                      <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.inkSoft,marginBottom:10}}>
                        Nivel de Madurez — {lv(Math.round(gsFilt)).label}
                      </div>
                      <p style={{fontSize:13.5,color:C.inkMid,lineHeight:1.7,margin:0}}>
                        {lv(Math.round(gsFilt)).desc}
                      </p>
                    </>
                  ) : (
                    <p style={{fontSize:13,color:C.inkFaint,margin:0,fontStyle:"italic"}}>
                      Complete el diagnóstico para ver la interpretación del nivel de madurez.
                    </p>
                  )}
                </div>
              </div>

              {/* Por criterio */}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                  <h3 style={{fontSize:14,fontWeight:700,margin:0}}>
                    Score por Criterio {rFilter==="all" ? "(promedio global)" : `— ${rubroFilt?.label}`}
                  </h3>
                </div>
                {CRITERIOS.map(c=>{const v=csFilt(c.key),l=v>0?lv(Math.round(v)):null;return(
                  <div key={c.key} style={{marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:10.5,fontWeight:800,color:C.redH,width:22,flexShrink:0}}>{c.num}</span>
                      <span style={{fontSize:12.5,fontWeight:600,flex:1}}>{c.icon} {c.label}</span>
                      {v>0?<Badge v={Math.round(v)} sm/>:<span style={{fontSize:10,color:C.inkSoft}}>Sin datos</span>}
                      <span style={{fontSize:13,fontWeight:700,color:v>0?l.c:C.inkFaint,width:24,textAlign:"right"}}>{fmt(v)}</span>
                    </div>
                    <div style={{paddingLeft:30}}><PBar v={v} color={v>0?l.c:C.borderSm}/></div>
                  </div>
                );})}
              </div>

              {/* Por paquete — solo si vista general */}
              {rFilter==="all" && (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                    <h3 style={{fontSize:14,fontWeight:700,margin:0}}>Score por Paquete</h3>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    {SHOWN_RUBROS.map(r=>{
                      const sc=rs(r.key),l=sc>0?lv(Math.round(sc)):null;
                      return(
                        <div key={r.key} onClick={()=>setRFilter(r.key)} style={{padding:"12px 14px",borderRadius:9,cursor:"pointer",background:sc>0?l.bg:C.bgStripe,border:`1px solid ${sc>0?l.border:C.borderSm}`,transition:"all .15s",position:"relative",overflow:"hidden"}}>
                          {sc>0&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:l.c}}/>}
                          <div style={{fontSize:20,marginBottom:5,marginTop:sc>0?3:0}}>{r.icon}</div>
                          <div style={{fontSize:12,fontWeight:700,marginBottom:5}}>{r.label}</div>
                          <div style={{fontSize:24,fontWeight:900,color:sc>0?l.c:C.borderSm,lineHeight:1}}>{fmt(sc)}</div>
                          {sc>0&&<div style={{fontSize:10,color:l.text,fontWeight:600,marginTop:2,marginBottom:5}}>{l.label}</div>}
                          <div style={{marginTop:sc>0?0:8}}><PBar v={sc} color={sc>0?l.c:C.borderSm}/></div>
                          <div style={{marginTop:6,fontSize:9.5,color:C.inkSoft,textAlign:"center"}}>Ver detalle →</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Si filtrado por paquete: detalle de criterios de ese paquete */}
              {rFilter!=="all" && (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                    <h3 style={{fontSize:14,fontWeight:700,margin:0}}>Detalle por pregunta — {rubroFilt?.label}</h3>
                  </div>
                  {CRITERIOS.map(c=>{
                    const sc=cs(rFilter,c.key),l=sc>0?lv(Math.round(sc)):null;
                    return(
                      <div key={c.key} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.borderSm}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div style={{width:24,height:24,borderRadius:5,background:sc>0?l.c:C.borderSm,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <span style={{fontSize:10,fontWeight:900,color:"white"}}>{c.num}</span>
                          </div>
                          <span style={{fontSize:13,fontWeight:700,flex:1}}>{c.icon} {c.label}</span>
                          {sc>0?<Badge v={Math.round(sc)} sm/>:<span style={{fontSize:10,color:C.inkSoft}}>Sin datos</span>}
                        </div>
                        {c.subs.map(sq=>{
                          const v=ans[rFilter]?.[sq.id]||0, sl=v>0?lv(v):null;
                          return(
                            <div key={sq.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.borderSm}`}}>
                              <p style={{fontSize:11,color:C.inkMid,flex:1,margin:0,lineHeight:1.45}}>{sq.t}</p>
                              {v>0
                                ? <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                                    <div style={{width:50,height:4,background:C.borderSm,borderRadius:99,overflow:"hidden"}}>
                                      <div style={{height:"100%",width:`${(v/5)*100}%`,background:sl.c,borderRadius:99}}/>
                                    </div>
                                    <span style={{fontSize:11,fontWeight:700,color:sl.c,width:16}}>{v}</span>
                                    <span style={{fontSize:10,color:sl.text,background:sl.bg,border:`1px solid ${sl.border}`,borderRadius:4,padding:"1px 5px"}}>{sl.label}</span>
                                  </div>
                                : <span style={{fontSize:10,color:C.inkFaint,flexShrink:0}}>—</span>
                              }
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
            );
          })()}

          {/* ══════════════════════════ BRECHAS & ROADMAP ══ */}
          {tab==="brechas" && (() => {
            const brechas = [];
            SHOWN_RUBROS.forEach(r => {
              CRITERIOS.forEach(c => {
                c.subs.forEach(sq => {
                  const v = ans[r.key]?.[sq.id] || 0;
                  if (v > 0) brechas.push({ rubro:r, crit:c, sq, score:v, gap:5-v, key:`${r.key}-${sq.id}` });
                });
              });
            });

            // Filtro por paquete
            const brechasFilt = bFilter === "all" ? brechas : brechas.filter(b => b.rubro.key === bFilter);

            const top10 = [...brechasFilt].sort((a,b) => b.gap-a.gap || a.score-b.score).slice(0,10);
            const sinData = brechas.length === 0;
            const FASES = [
              {label:"Quick Wins",  sub:"0–3 meses",  color:"#16A34A", bg:"#F0FDF4", border:"#BBF7D0", icon:"⚡", items: top10.filter(b=>b.score<=2)},
              {label:"Corto Plazo", sub:"3–6 meses",  color:"#D97706", bg:"#FFFBEB", border:"#FDE68A", icon:"📅", items: top10.filter(b=>b.score===3)},
              {label:"Largo Plazo", sub:"6–18 meses", color:"#2563EB", bg:"#EFF6FF", border:"#BFDBFE", icon:"🎯", items: top10.filter(b=>b.score>=4&&b.gap>0)},
            ];
            const any = FASES.some(f=>f.items.length>0);
            if (!any && top10.length) {
              FASES[0].items = top10.slice(0,3);
              FASES[1].items = top10.slice(3,6);
              FASES[2].items = top10.slice(6,10);
            }
            return (
              <div style={{maxWidth:1060}}>
                <div style={{marginBottom:20, display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:12}}>
                  <div>
                    <h2 style={{fontSize:18, fontWeight:800, margin:"0 0 4px", letterSpacing:"-0.02em"}}>Brechas & Roadmap</h2>
                    <p style={{fontSize:12, color:C.inkMid, margin:0}}>
                      {bFilter==="all" ? `General · ${brechas.length} respuestas` : `${SHOWN_RUBROS.find(r=>r.key===bFilter)?.label} · ${brechasFilt.length} respuestas`}
                      {" · "}Top 10 brechas ordenadas por gap al nivel óptimo (5)
                    </p>
                  </div>
                  {/* Filtro */}
                  <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                    <button onClick={()=>setBFilter("all")} style={{
                      padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FF,
                      border:`1.5px solid ${bFilter==="all" ? C.red : C.border}`,
                      background: bFilter==="all" ? C.redLight : C.white,
                      color: bFilter==="all" ? C.redH : C.inkMid,
                    }}>
                      🏢 General (Claro)
                    </button>
                    {SHOWN_RUBROS.map(r => (
                      <button key={r.key} onClick={()=>setBFilter(r.key)} style={{
                        padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:FF,
                        border:`1.5px solid ${bFilter===r.key ? C.red : C.border}`,
                        background: bFilter===r.key ? C.redLight : C.white,
                        color: bFilter===r.key ? C.redH : C.inkMid,
                      }}>
                        {r.icon} {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                {sinData ? (
                  <div style={{padding:48, textAlign:"center", color:C.inkSoft, background:C.white, borderRadius:12, border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:32, marginBottom:12}}>📋</div>
                    <div style={{fontSize:14, fontWeight:600}}>Completa el diagnóstico primero</div>
                    <div style={{fontSize:12, marginTop:4}}>Responde preguntas en el tab Diagnóstico para ver las brechas y roadmap.</div>
                  </div>
                ) : (
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                    {/* Top 10 */}
                    <div style={{background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden"}}>
                      <div style={{padding:"14px 18px", borderBottom:`1px solid ${C.border}`, background:C.redLight, display:"flex", alignItems:"center", gap:8}}>
                        <div style={{width:6, height:18, borderRadius:3, background:C.red}}/>
                        <div>
                          <div style={{fontSize:13, fontWeight:800, color:C.ink}}>Top 10 Brechas</div>
                          <div style={{fontSize:10, color:C.inkSoft}}>Mayor distancia al nivel óptimo</div>
                        </div>
                      </div>
                      <div style={{padding:"4px 16px 12px"}}>
                        {top10.map((b,i) => {
                          const l = lv(b.score);
                          return (
                            <div key={b.key} style={{padding:"10px 0", borderBottom:i<9?`1px solid ${C.borderSm}`:"none", display:"flex", gap:10, alignItems:"flex-start"}}>
                              <div style={{width:22, height:22, borderRadius:"50%", flexShrink:0, background:i<3?C.red:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:i<3?"white":C.inkMid, marginTop:1}}>{i+1}</div>
                              <div style={{flex:1, minWidth:0}}>
                                <div style={{fontSize:9.5, color:C.inkSoft, marginBottom:3}}>{b.rubro.icon} {b.rubro.label} · {b.crit.num} {b.crit.label}</div>
                                <p style={{fontSize:11.5, color:C.ink, margin:"0 0 6px", lineHeight:1.45}}>{b.sq.t}</p>
                                <div style={{display:"flex", alignItems:"center", gap:8}}>
                                  <div style={{flex:1, height:4, background:C.borderSm, borderRadius:99, overflow:"hidden"}}>
                                    <div style={{height:"100%", width:`${(b.score/5)*100}%`, background:l.c, borderRadius:99}}/>
                                  </div>
                                  <span style={{fontSize:10, fontWeight:700, color:l.c, flexShrink:0}}>{b.score}/5</span>
                                  <span style={{fontSize:10, color:"#DC2626", fontWeight:700, flexShrink:0}}>gap −{b.gap}</span>
                                </div>
                                {b.sq.opp && (
                                  <div style={{marginTop:6, padding:"7px 10px", background:"#F0FDF4", borderRadius:6, border:"1px solid #BBF7D0"}}>
                                    <span style={{fontSize:10, fontWeight:700, color:"#16A34A"}}>💡 Oportunidad: </span>
                                    <span style={{fontSize:11, color:"#166534", lineHeight:1.45}}>{b.sq.opp}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Roadmap */}
                    <div style={{display:"flex", flexDirection:"column", gap:14}}>
                      {FASES.map((f,fi) => (
                        <div key={fi} style={{background:C.white, borderRadius:12, border:`1px solid ${f.border}`, overflow:"hidden"}}>
                          <div style={{padding:"12px 16px", background:f.bg, borderBottom:`1px solid ${f.border}`, display:"flex", alignItems:"center", gap:10}}>
                            <span style={{fontSize:18}}>{f.icon}</span>
                            <div>
                              <div style={{fontSize:13, fontWeight:800, color:f.color}}>{f.label}</div>
                              <div style={{fontSize:10, color:f.color, opacity:0.8}}>{f.sub}</div>
                            </div>
                            <div style={{marginLeft:"auto", fontSize:11, fontWeight:700, color:f.color, background:"white", padding:"2px 8px", borderRadius:99, border:`1px solid ${f.border}`}}>
                              {f.items.length} acción{f.items.length!==1?"es":""}
                            </div>
                          </div>
                          <div style={{padding:"8px 14px"}}>
                            {f.items.length===0
                              ? <p style={{fontSize:11, color:C.inkSoft, margin:"6px 0", fontStyle:"italic"}}>Sin brechas en esta fase.</p>
                              : f.items.map((b,bi) => (
                                <div key={b.key} style={{display:"flex", gap:8, alignItems:"flex-start", padding:"8px 0", borderBottom:bi<f.items.length-1?`1px solid ${C.borderSm}`:"none"}}>
                                  <div style={{width:5, height:5, borderRadius:"50%", background:f.color, flexShrink:0, marginTop:6}}/>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:10, color:f.color, fontWeight:700, marginBottom:2}}>{b.rubro.icon} {b.rubro.label} · {b.crit.label}</div>
                                    <p style={{fontSize:11.5, color:C.ink, margin:"0 0 4px", lineHeight:1.4}}>{b.sq.t}</p>
                                    <div style={{fontSize:10, color:C.inkSoft, marginBottom: b.sq.opp ? 5 : 0}}>
                                      Nivel actual: <span style={{fontWeight:700, color:lv(b.score).c}}>{b.score} – {lv(b.score).label}</span>
                                      {" "}→ Meta: <span style={{fontWeight:700, color:f.color}}>5 – Optimizado</span>
                                    </div>
                                    {b.sq.opp && (
                                      <div style={{padding:"6px 9px", background:"white", borderRadius:5, border:`1px solid ${f.border}`}}>
                                        <span style={{fontSize:10, fontWeight:700, color:f.color}}>💡 </span>
                                        <span style={{fontSize:10.5, color:C.inkMid, lineHeight:1.4}}>{b.sq.opp}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </main>
    </div>
  );
}
