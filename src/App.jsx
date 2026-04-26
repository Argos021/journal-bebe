import { useState, useEffect, useRef } from "react";
import { db } from "./firebase.js";
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDoc } from "firebase/firestore";

const STORAGE_KEY = "baby_feedings_v1";
const GROWTH_KEY = "baby_growth_v1";
const SETTINGS_KEY = "baby_settings_v1";
const PROFILE_KEY = "baby_profile_v1";
const APPTS_KEY = "baby_appointments_v1";
const HOURS_OPTIONS = [0,1,2,3,4,5,6,7,8,9,10,11,12];
const MINUTES_OPTIONS = [0,5,10,15,20,25,30,35,40,45,50,55];

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDuration(totalMinutes) {
  const mins = parseInt(totalMinutes);
  if (!mins) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}
function formatTime(date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function getNextFeedingTime(timeStr, durationMinutes) {
  if (!timeStr || !durationMinutes) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const base = new Date();
  base.setHours(h, m, 0, 0);
  base.setMinutes(base.getMinutes() + parseInt(durationMinutes));
  return formatTime(base);
}
function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,"0");
  const d = String(now.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
function getNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
}
function timeSince(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const then = new Date(dateStr + "T12:00:00");
  then.setHours(h, m, 0, 0);
  const diffMs = Date.now() - then.getTime();
  if (diffMs < 0) return null;
  const diffMins = Math.floor(diffMs / 60000);
  const dh = Math.floor(diffMins / 60), dm = diffMins % 60;
  if (dh > 0) return `${dh}h ${dm}min`;
  return `${dm}min`;
}

const initialForm = {
  date: todayStr(), time: getNow(), durationH: 3, durationM: 0,
  seinPremier: null, complMaternel: "", complCommercial: "", pipi: false, caca: false,
  vitamineD: false, nombril: false, yeux: false, note: "",
};

// ── DaySummary ───────────────────────────────────────────────────────────────
function DaySummary({ entries, dark }) {
  const boires = entries.filter(e => e._type !== "couche");
  const nbBoires = boires.length;
  const nbPipi = entries.filter(e => e.pipi).length;
  const nbCaca = entries.filter(e => e.caca).length;
  const nbNombril = boires.filter(e => e.nombril).length;
  const nbYeux = boires.filter(e => e.yeux).length;
  const vitamineD = boires.some(e => e.vitamineD);
  const complMaternelle = parseFloat(boires.reduce((s,e) => {
    const legacy = (e.complementType==="maternel") ? (parseFloat(e.complement)||0) : 0;
    return s + (parseFloat(e.complMaternel)||0) + legacy;
  }, 0).toFixed(2));
  const complCommercial = parseFloat(boires.reduce((s,e) => {
    const legacy = (e.complementType==="commercial") ? (parseFloat(e.complement)||0) : 0;
    return s + (parseFloat(e.complCommercial)||0) + legacy;
  }, 0).toFixed(2));
  const totalComplement = parseFloat((complMaternelle + complCommercial).toFixed(2));
  const items = [
    { icon:"🍼", label:"Boire"+(nbBoires>1?"s":""), val:nbBoires, color: dark?"#4a3020":"#fdebd0", show:true },
    { icon:"💧", label:"Pipi", val:nbPipi, color: dark?"#1a3050":"#ddeeff", show:nbPipi>0 },
    { icon:"💩", label:"Caca", val:nbCaca, color: dark?"#3a2a10":"#fdebd0", show:nbCaca>0 },
    { icon:"🫧", label:"Nombril", val:nbNombril, color: dark?"#1a3020":"#e8f5e9", show:nbNombril>0 },
    { icon:"👁️", label:"Yeux", val:nbYeux, color: dark?"#2a1a3a":"#f3e5f5", show:nbYeux>0 },
    { icon:"🤱", label:"ml maternel", val:complMaternelle>0?complMaternelle:null, color: dark?"#3a1a2a":"#f9c6d8", show:complMaternelle>0 },
    { icon:"🏭", label:"ml commercial", val:complCommercial>0?complCommercial:null, color: dark?"#1a2a3a":"#e3f2fd", show:complCommercial>0 },
  ];
  return (
    <div style={{ background: dark?"rgba(0,0,0,0.3)":"rgba(255,255,255,0.7)", borderRadius:12, padding:"10px 14px", marginTop:8, marginBottom:4 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
        {items.filter(i=>i.show).map(i=>(
          <span key={i.label} style={{ background:i.color, borderRadius:20, padding:"3px 10px", fontSize:12, color: dark?"#f5c6a0":"#5a3020", fontWeight:"bold", display:"flex", alignItems:"center", gap:4 }}>
            {i.icon} {i.val!==null?`${i.val} `:""}{i.label}
          </span>
        ))}
      </div>
      <div style={{ fontSize:12, fontWeight:"bold", color: vitamineD?(dark?"#f48fb1":"#e06b8a"):(dark?"#555":"#bbb") }}>
        {vitamineD?"✅ Vitamine D donnée":"⬜ Vitamine D non encore indiquée"}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function BabyTracker() {
  const [feedings, setFeedings] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [settings, setSettings] = useState({darkMode:"off",babyName:"Bébé"});
  const [profile, setProfile] = useState({nom:"",dateNaissance:"",heureNaissance:"",sexe:"",poidsNaissance:"",tailleNaissance:"",perimCranien:"",typeAlimentation:""});
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("journal"); // journal | croissance | options
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [summaryOnly, setSummaryOnly] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCoucheForm, setShowCoucheForm] = useState(false);
  const initialCoucheForm = { date: todayStr(), time: getNow(), pipi: false, caca: false, note: "" };
  const [coucheForm, setCoucheForm] = useState({ date: todayStr(), time: getNow(), pipi: false, caca: false, note: "" });
  const [showGrowthForm, setShowGrowthForm] = useState(false);
  const [growthForm, setGrowthForm] = useState({ date: todayStr(), poids: "", taille: "", crane: "", note: "" });
  const [growthEditId, setGrowthEditId] = useState(null);
  const [growthInputUnit, setGrowthInputUnit] = useState("g");
  const [confirmDelete, setConfirmDelete] = useState(null); // { message, onConfirm }

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef(null);
  const importRef = useRef();

  const darkModeSetting = settings.darkMode || "off";
  const dark = darkModeSetting === "on" ? true
    : darkModeSetting === "off" ? false
    : (() => { const h = new Date().getHours(); return h >= 20 || h < 6; })();
  const bg = dark ? "#1a1a2e" : "#fdf6f0";
  const cardBg = dark ? "#2a2a3e" : "#fff";
  const textPrimary = dark ? "#f5c6a0" : "#7a3b1e";
  const textSecondary = dark ? "#b05a30" : "#b05a30";
  const borderColor = dark ? "#3a3a5e" : "#e8c5a8";

  // Firebase real-time listeners
  useEffect(() => {
    const unsubs = [];
    unsubs.push(onSnapshot(collection(db, "feedings"), snap => {
      setFeedings(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    }));
    unsubs.push(onSnapshot(collection(db, "growth"), snap => {
      setGrowth(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }));
    unsubs.push(onSnapshot(collection(db, "appointments"), snap => {
      setAppointments(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }));
    unsubs.push(onSnapshot(doc(db, "config", "settings"), snap => {
      if (snap.exists()) setSettings(snap.data());
    }));
    unsubs.push(onSnapshot(doc(db, "config", "profile"), snap => {
      if (snap.exists()) setProfile(snap.data());
    }));
    return () => unsubs.forEach(u => u());
  }, []);

  // Helper functions to save profile and settings manually
  function saveProfile(newProfile) {
    setProfile(newProfile);
    setDoc(doc(db, "config", "profile"), newProfile).catch(()=>{});
  }
  function saveSettings(newSettings) {
    setSettings(newSettings);
    setDoc(doc(db, "config", "settings"), newSettings).catch(()=>{});
  }

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s+1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  function showToast(msg, color="#4caf50") { setToast({msg,color}); setTimeout(()=>setToast(null),3000); }

  const grouped = feedings.reduce((acc,f) => { if(!acc[f.date]) acc[f.date]=[]; acc[f.date].push(f); return acc; }, {});
  const sortedDates = Object.keys(grouped).sort((a,b)=>b.localeCompare(a));

  // Last feeding
  const lastFeeding = feedings.length > 0 ? feedings.reduce((latest, f) => {
    const fDt = f.date + "T" + f.time;
    const lDt = latest.date + "T" + latest.time;
    return fDt > lDt ? f : latest;
  }) : null;
  const lastFeedingAgo = lastFeeding ? timeSince(lastFeeding.date, lastFeeding.time) : null;
  const lastFeedingNext = lastFeeding ? (() => {
    const totalMins = (parseInt(lastFeeding.durationH)||0)*60+(parseInt(lastFeeding.durationM)||0) || (parseInt(lastFeeding.duration)||0);
    return getNextFeedingTime(lastFeeding.time, totalMins);
  })() : null;

  async function handleSubmit() {
    if (!form.time||!form.date) return;
    const id = editId || String(Date.now());
    const entry = {...form};
    await setDoc(doc(db, "feedings", id), entry);
    if (editId) { setEditId(null); showToast("Boire modifié !"); }
    else { showToast("Boire ajouté !"); }
    setForm({...initialForm, date:todayStr(), time:getNow()});
    setShowForm(false);
  }

  function handleEdit(f) {
    let dH=f.durationH!==undefined?f.durationH:0, dM=f.durationM!==undefined?f.durationM:0;
    if(f.duration&&f.durationH===undefined){const t=parseInt(f.duration)||0; dH=Math.floor(t/60); dM=t%60;}
    let seinPremier=f.seinPremier!==undefined?f.seinPremier:null;
    if(seinPremier===null&&(f.seinGauche||f.seinDroit)) seinPremier=f.seinGauche?"gauche":"droite";
    setForm({date:f.date||todayStr(),time:f.time,durationH:dH,durationM:dM,seinPremier,
      complMaternel: f.complMaternel!==undefined ? f.complMaternel : (f.complementType==="maternel"?f.complement||"":""),
      complCommercial: f.complCommercial!==undefined ? f.complCommercial : (f.complementType==="commercial"?f.complement||"":""),
      pipi:f.pipi,caca:f.caca,vitamineD:f.vitamineD||false,nombril:f.nombril||false,yeux:f.yeux||false,note:f.note});
    setEditId(f.id); setShowForm(true);
  }

  function handleDelete(id) {
    setConfirmDelete({
      message: "Supprimer cette entrée ?",
      onConfirm: () => { deleteDoc(doc(db, "feedings", String(id))); showToast("Entrée supprimée","#e8906a"); }
    });
  }

  async function handleAddCouche() {
    if (!coucheForm.pipi && !coucheForm.caca) {
      showToast("⚠️ Sélectionne pipi ou caca", "#ff9800"); return;
    }
    const id = String(Date.now());
    await setDoc(doc(db, "feedings", id), { _type: "couche", ...coucheForm });
    showToast("🧷 Couche ajoutée !");
    setCoucheForm({ date: todayStr(), time: getNow(), pipi: false, caca: false, note: "" });
    setShowCoucheForm(false);
  }
  function cancelForm() { setForm({...initialForm,date:todayStr(),time:getNow()}); setEditId(null); setShowForm(false); }

  // Export JSON — data URI method for mobile compatibility
  function handleExport() {
    const filename=`boires_${todayStr()}.json`;
    const json=JSON.stringify(feedings,null,2);
    const dataUri="data:application/json;charset=utf-8,"+encodeURIComponent(json);
    const a=document.createElement("a"); a.href=dataUri; a.download=filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast(`📥 Exporté : ${filename}`);
  }

  // Export CSV
  function handleExportCSV() {
    const headers=["Date","Heure","Durée","Sein départ","Complément ml","Pipi","Caca","Vitamine D","Nombril","Yeux","Note"];
    const rows=feedings.map(f=>{
      const dH=parseInt(f.durationH)||0, dM=parseInt(f.durationM)||0;
      const dur=formatDuration(dH*60+dM)||"";
      return [f.date,f.time,dur,f.seinPremier||"",f.complement||"",f.pipi?"oui":"",f.caca?"oui":"",f.vitamineD?"oui":"",f.nombril?"oui":"",f.yeux?"oui":"",f.note||""];
    });
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`boires_${todayStr()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast("📊 CSV exporté !");
  }

  // Export PDF (simple print)
  function handleExportPDF() {
    const win=window.open("","_blank");
    const rows=feedings.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).map(f=>{
      const dH=parseInt(f.durationH)||0,dM=parseInt(f.durationM)||0;
      const dur=formatDuration(dH*60+dM)||"—";
      const sein=f.seinPremier?`${f.seinPremier} → ${f.seinPremier==="gauche"?"droite":"gauche"}`:"—";
      const soins=[f.vitamineD?"Vit.D":"",f.nombril?"Nombril":"",f.yeux?"Yeux":""].filter(Boolean).join(", ")||"—";
      const couche=[f.pipi?"Pipi":"",f.caca?"Caca":""].filter(Boolean).join(", ")||"—";
      return `<tr><td>${f.date}</td><td>${f.time}</td><td>${dur}</td><td>${sein}</td><td>${f.complement||"—"} ml</td><td>${couche}</td><td>${soins}</td><td>${f.note||"—"}</td></tr>`;
    }).join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Journal des boires</title><style>body{font-family:Georgia,serif;padding:20px}h1{color:#7a3b1e}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f5c6a0;color:#7a3b1e;padding:6px 8px;text-align:left}td{padding:5px 8px;border-bottom:1px solid #eee}tr:nth-child(even){background:#fdf6f0}</style></head><body><h1>🍼 Journal des boires — ${settings.babyName}</h1><p>Exporté le ${new Date().toLocaleDateString("fr-FR")}</p><table><thead><tr><th>Date</th><th>Heure</th><th>Durée</th><th>Sein</th><th>Complément</th><th>Couche</th><th>Soins</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.print();
    showToast("🖨️ PDF prêt à imprimer !");
  }

  function handleImportFile(e) {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(evt)=>{ try{ const p=JSON.parse(evt.target.result); if(!Array.isArray(p)) throw new Error(); setPendingImport(p); setShowImportConfirm(true); }catch{ showToast("Fichier invalide","#e53935"); }};
    reader.readAsText(file); e.target.value="";
  }
  async function confirmImport() {
    const batch = pendingImport || [];
    for (const entry of batch) {
      const id = String(entry.id || Date.now() + Math.random());
      await setDoc(doc(db, "feedings", id), {...entry, id});
    }
    setPendingImport(null);
    setShowImportConfirm(false);
    showToast(`${batch.length} boires importés !`);
  }

  // Growth
  async function handleAddGrowth() {
    if (!growthForm.date) return;
    let poidsGrams = growthForm.poids;
    if (growthInputUnit === "lb" && growthForm.poids) {
      poidsGrams = (parseFloat(growthForm.poids) * 453.592).toFixed(0);
    }
    const id = growthEditId || String(Date.now());
    await setDoc(doc(db, "growth", String(id)), {...growthForm, poids: poidsGrams});
    showToast(growthEditId ? "📏 Mesure modifiée !" : "📏 Mesure ajoutée !");
    setGrowthForm({ date: todayStr(), poids: "", taille: "", crane: "", note: "" });
    setGrowthEditId(null);
    setShowGrowthForm(false);
  }

  function handleEditGrowth(g) {
    let poidsVal = g.poids;
    if (growthInputUnit === "lb" && g.poids) {
      poidsVal = (parseFloat(g.poids) / 453.592).toFixed(2);
    }
    setGrowthForm({ date: g.date, poids: poidsVal, taille: g.taille, crane: g.crane||"", note: g.note || "" });
    setGrowthEditId(g.id);
    setShowGrowthForm(true);
  }

  const durationTotalMins=(parseInt(form.durationH)||0)*60+(parseInt(form.durationM)||0);

  const dynInputStyle={...inputStyleBase, border:`1.5px solid ${borderColor}`, background: dark?"#1e1e30":"#fdf6f0", color: dark?"#f5deb3":"#5a3020"};
  const dynCardStyle={background:cardBg, borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", borderLeft:`4px solid #e8906a`};

  const [headerCompact, setHeaderCompact] = useState(false);

  if (loading) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f5c6a0,#f9a8c0)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontSize:60}}>🍼</div>
      <div style={{fontSize:18,fontWeight:"bold",color:"#7a3b1e"}}>Journal Bébé</div>
      <div style={{fontSize:14,color:"#b05a30"}}>Connexion en cours...</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:bg, fontFamily:"'Georgia',serif", padding:"0 0 120px", transition:"background 0.3s" }}>

      <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} style={{display:"none"}} />

      {toast && (
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"white",borderRadius:50,padding:"10px 24px",fontSize:14,fontWeight:"bold",boxShadow:"0 4px 20px rgba(0,0,0,0.2)",zIndex:999,whiteSpace:"nowrap"}}>
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        background: dark?"linear-gradient(135deg,#2a1a3e 0%,#1a2a3e 100%)":"linear-gradient(135deg,#f5c6a0 0%,#f9a8c0 100%)",
        borderBottom:`3px solid ${dark?"#5a3a6e":"#e8906a"}`,
        position:"sticky", top:0, zIndex:10,
        boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
      }}>
        {/* Top bar: always visible, contains all info + collapse toggle */}
        <div style={{padding: headerCompact ? "6px 12px 0" : "14px 16px 0", transition:"padding 0.25s ease", position:"relative"}}>

          {/* Gear + collapse toggle buttons */}
          <div style={{position:"absolute", top: headerCompact?4:8, right:8, display:"flex", gap:4}}>
            <button
              onClick={()=>setHeaderCompact(v=>!v)}
              title={headerCompact?"Agrandir le header":"Réduire le header"}
              style={{background:"transparent",border:"none",borderRadius:"50%",width:30,height:30,fontSize:16,cursor:"pointer",color:textSecondary,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.7}}
            >
              {headerCompact ? "⬇" : "⬆"}
            </button>
            <button onClick={()=>setTab("options")} style={{background:tab==="options"?(dark?"rgba(244,143,177,0.2)":"rgba(232,144,106,0.15)"):"transparent",border:`1.5px solid ${tab==="options"?(dark?"#f48fb1":"#e8906a"):"transparent"}`,borderRadius:"50%",width:30,height:30,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              ⚙️
            </button>
          </div>

          {/* Compact view: single line with boire info */}
          {headerCompa
