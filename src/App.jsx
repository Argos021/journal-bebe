import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "./firebase.js";
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDoc } from "firebase/firestore";

// Base styles — declared at top so all components can use them
const inputStyleBase={width:"100%",padding:"10px 14px",borderRadius:10,fontSize:15,marginBottom:14,boxSizing:"border-box",outline:"none",fontFamily:"Georgia,serif"};
const btnPrimaryBase={flex:2,padding:"13px 0",borderRadius:12,border:"none",background:"linear-gradient(135deg,#e8906a,#e06b8a)",color:"white",fontSize:16,fontWeight:"bold",cursor:"pointer"};
const btnSecondaryBase={flex:1,padding:"13px 0",borderRadius:12,border:"2px solid #e8c5a8",background:"white",color:"#b05a30",fontSize:15,cursor:"pointer"};

const APP_VERSION = "1.2.6";

// ── WHO Growth Reference Data ─────────────────────────────────────────────────
// Source: WHO Child Growth Standards (0-24 months)
// Age in months, values in kg for weight, cm for height/head circumference
// Percentiles: P3, P15, P50, P85, P97

const WHO_WEIGHT_GIRLS = [
  // [month, P3, P15, P50, P85, P97]
  [0,2.4,2.8,3.2,3.7,4.2],[1,3.2,3.6,4.2,4.8,5.5],[2,3.9,4.5,5.1,5.8,6.6],
  [3,4.5,5.2,5.8,6.6,7.5],[4,5.0,5.7,6.4,7.3,8.2],[5,5.4,6.1,6.9,7.8,8.8],
  [6,5.7,6.5,7.3,8.2,9.3],[7,6.0,6.8,7.6,8.6,9.8],[8,6.3,7.0,7.9,9.0,10.2],
  [9,6.5,7.3,8.2,9.3,10.5],[10,6.7,7.5,8.5,9.6,10.9],[11,6.9,7.7,8.7,9.9,11.2],
  [12,7.0,7.9,8.9,10.1,11.5],[15,7.6,8.5,9.6,10.9,12.4],[18,8.1,9.1,10.2,11.6,13.2],
  [21,8.6,9.6,10.9,12.3,14.0],[24,9.0,10.2,11.5,13.0,14.8],
];
const WHO_WEIGHT_BOYS = [
  [0,2.5,2.9,3.3,3.9,4.4],[1,3.4,3.9,4.5,5.1,5.8],[2,4.3,4.9,5.6,6.3,7.1],
  [3,5.0,5.7,6.4,7.2,8.0],[4,5.6,6.2,7.0,7.8,8.7],[5,6.0,6.7,7.5,8.4,9.3],
  [6,6.4,7.1,7.9,8.8,9.8],[7,6.7,7.4,8.3,9.2,10.3],[8,6.9,7.7,8.6,9.6,10.7],
  [9,7.1,7.9,8.9,9.9,11.0],[10,7.4,8.2,9.2,10.2,11.4],[11,7.6,8.4,9.4,10.5,11.7],
  [12,7.7,8.6,9.6,10.8,12.0],[15,8.4,9.4,10.5,11.7,13.1],[18,9.0,10.0,11.3,12.6,14.1],
  [21,9.6,10.7,12.0,13.4,15.0],[24,10.2,11.3,12.7,14.2,15.9],
];
const WHO_HEIGHT_GIRLS = [
  [0,44.8,46.8,49.1,51.5,53.5],[1,50.2,52.4,53.7,55.6,57.6],[2,53.0,55.2,57.1,59.1,61.1],
  [3,55.6,57.7,59.8,61.9,63.9],[4,57.8,59.9,62.1,64.3,66.4],[5,59.6,61.8,64.0,66.3,68.5],
  [6,61.2,63.5,65.7,68.0,70.3],[7,62.7,65.0,67.3,69.7,72.1],[8,64.0,66.4,68.7,71.2,73.7],
  [9,65.3,67.7,70.1,72.6,75.2],[10,66.5,68.9,71.5,74.0,76.7],[11,67.7,70.1,72.8,75.4,78.1],
  [12,68.9,71.3,74.0,76.7,79.5],[15,72.0,74.8,77.5,80.3,83.1],[18,75.0,77.8,80.7,83.7,86.7],
  [21,77.5,80.5,83.7,86.8,90.0],[24,80.0,83.2,86.4,89.7,93.0],
];
const WHO_HEIGHT_BOYS = [
  [0,46.1,48.2,49.9,51.8,53.8],[1,51.1,53.3,54.7,56.5,58.6],[2,54.4,56.4,58.4,60.4,62.4],
  [3,57.3,59.4,61.4,63.5,65.5],[4,59.7,61.8,63.9,66.0,68.0],[5,61.7,63.8,65.9,68.0,70.1],
  [6,63.3,65.5,67.6,69.8,71.9],[7,64.8,67.0,69.2,71.5,73.7],[8,66.2,68.4,70.6,73.0,75.3],
  [9,67.5,69.7,72.0,74.4,76.8],[10,68.7,71.0,73.3,75.8,78.2],[11,69.9,72.2,74.5,77.1,79.6],
  [12,71.0,73.4,75.7,78.4,81.0],[15,74.0,76.6,79.1,81.8,84.5],[18,76.9,79.6,82.3,85.2,88.0],
  [21,79.7,82.5,85.6,88.6,91.6],[24,82.3,85.5,87.8,91.2,94.5],
];
const WHO_HEAD_GIRLS = [
  [0,31.7,32.9,33.9,35.1,36.2],[1,33.9,35.1,36.1,37.2,38.3],[2,35.4,36.6,37.6,38.7,39.8],
  [3,36.6,37.8,38.8,39.9,41.0],[4,37.6,38.8,39.8,40.9,42.0],[5,38.4,39.6,40.6,41.7,42.8],
  [6,39.1,40.3,41.3,42.4,43.5],[9,40.7,41.9,42.9,44.0,45.1],[12,41.9,43.1,44.2,45.3,46.4],
  [18,43.4,44.6,45.7,46.8,47.9],[24,44.5,45.7,46.9,48.0,49.1],
];
const WHO_HEAD_BOYS = [
  [0,32.8,34.0,34.5,35.8,37.0],[1,35.4,36.6,37.3,38.5,39.7],[2,37.0,38.2,39.1,40.3,41.5],
  [3,38.2,39.4,40.5,41.7,42.9],[4,39.2,40.4,41.6,42.8,44.0],[5,40.1,41.3,42.6,43.8,45.0],
  [6,40.9,42.1,43.3,44.6,45.8],[9,42.3,43.5,44.8,46.1,47.3],[12,43.4,44.7,46.0,47.3,48.6],
  [18,44.9,46.2,47.6,48.9,50.2],[24,45.9,47.3,48.7,50.1,51.4],
];

// Interpolate WHO value for a given age in months
function whoInterpolate(table, ageMonths) {
  if (ageMonths < 0) return null;
  const sorted = [...table].sort((a,b)=>a[0]-b[0]);
  const last = sorted[sorted.length-1];
  if (ageMonths > last[0]) return null;
  for (let i=0; i<sorted.length-1; i++) {
    const [m0,p3_0,p15_0,p50_0,p85_0,p97_0] = sorted[i];
    const [m1,p3_1,p15_1,p50_1,p85_1,p97_1] = sorted[i+1];
    if (ageMonths >= m0 && ageMonths <= m1) {
      const t = (ageMonths - m0) / (m1 - m0);
      const lerp = (a,b) => a + t*(b-a);
      return [lerp(p3_0,p3_1), lerp(p15_0,p15_1), lerp(p50_0,p50_1), lerp(p85_0,p85_1), lerp(p97_0,p97_1)];
    }
  }
  return null;
}

function getWhoTable(metric, sexe) {
  const isGirl = sexe === "fille";
  if (metric === "poids")  return isGirl ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
  if (metric === "taille") return isGirl ? WHO_HEIGHT_GIRLS : WHO_HEIGHT_BOYS;
  if (metric === "crane")  return isGirl ? WHO_HEAD_GIRLS   : WHO_HEAD_BOYS;
  return null;
}

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
export default function BabyTracker({ onRegisterShowBoire, onRegisterShowCouche, onTabChange, onFormOpen, onFormClose }) {
  const [feedings, setFeedings] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [settings, setSettings] = useState({darkMode:"off",babyName:"Bébé"});
  const [profile, setProfile] = useState({nom:"",dateNaissance:"",heureNaissance:"",sexe:"",poidsNaissance:"",tailleNaissance:"",perimCranien:"",typeAlimentation:""});
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const VALID_TABS = ["profil","journal","croissance","sante","options"];

  const [tab, setTab] = useState(() => {
    const hash = window.location.hash.replace("#","");
    return VALID_TABS.includes(hash) ? hash : "journal";
  });

  function handleTabChange(t) {
    setTab(t);
    window.location.hash = t;
    onTabChange?.(t);
  }

  // Sync hash → tab if user navigates back/forward
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#","");
      if (VALID_TABS.includes(hash)) setTab(hash);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Register FAB callbacks so main.jsx can trigger modals
  useEffect(() => {
    onRegisterShowBoire?.(() => {
      setForm({...initialForm, date:todayStr(), time:getNow()});
      setShowForm(true);
      setEditId(null);
      onFormOpen?.();
    });
    onRegisterShowCouche?.(() => {
      setCoucheForm({date:todayStr(), time:getNow(), pipi:false, caca:false, note:""});
      setShowCoucheForm(true);
      onFormOpen?.();
    });
  }, []);
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
  const boireEntries = feedings.filter(f => f._type !== "couche");
  const lastFeeding = boireEntries.length > 0 ? boireEntries.reduce((latest, f) => {
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
    onFormClose?.();
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
    onFormClose?.();
  }
  function cancelForm() { setForm({...initialForm,date:todayStr(),time:getNow()}); setEditId(null); setShowForm(false); onFormClose?.(); }

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
            <button onClick={()=>handleTabChange("options")} style={{background:tab==="options"?(dark?"rgba(244,143,177,0.2)":"rgba(232,144,106,0.15)"):"transparent",border:`1.5px solid ${tab==="options"?(dark?"#f48fb1":"#e8906a"):"transparent"}`,borderRadius:"50%",width:30,height:30,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              ⚙️
            </button>
          </div>

          {/* Compact view: single line with boire info */}
          {headerCompact ? (
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:textPrimary,paddingRight:72,paddingBottom:6}}>
              <span style={{fontWeight:"bold"}}>🍼 {profile.nom || settings.babyName}</span>
              {lastFeeding && <>
                <span style={{color:textSecondary}}>· {lastFeeding.time}</span>
                {lastFeedingAgo && <span style={{color:textSecondary}}>({lastFeedingAgo})</span>}
                {lastFeedingNext && <span style={{color:dark?"#f48fb1":"#e06b8a",fontWeight:"bold"}}>· ➜ {lastFeedingNext}</span>}
              </>}
            </div>
          ) : (
            /* Expanded view */
            <div style={{textAlign:"center", paddingRight:72}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:2}}>
                <span style={{fontSize:22}}>🍼</span>
                <h1 style={{margin:0,fontSize:20,color:textPrimary,letterSpacing:1,fontWeight:"bold"}}>{profile.nom || settings.babyName}</h1>
                {profile.dateNaissance && (() => {
                  const timeStr = profile.heureNaissance || "00:00";
                  const diffMs = new Date() - new Date(profile.dateNaissance+"T"+timeStr+":00");
                  if (diffMs < 0) return null;
                  const diffDays = Math.floor(diffMs / 86400000);
                  const diffHours = Math.floor(diffMs / 3600000);
                  const label = diffHours < 24 ? `${diffHours}h` : diffDays < 14 ? `${diffDays}j` : diffDays < 90 ? `${Math.floor(diffDays/7)} sem` : `${Math.floor(diffDays/30.44)} mois`;
                  return <span style={{fontSize:12,background:dark?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.6)",borderRadius:20,padding:"2px 10px",color:textSecondary,fontWeight:"bold"}}>{label}</span>;
                })()}
              </div>
              <p style={{margin:"2px 0 8px",color:textSecondary,fontSize:11}}>💾 Sauvegarde automatique</p>
              {lastFeeding && (
                <div style={{background:dark?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.6)",borderRadius:10,padding:"6px 12px",marginBottom:8,fontSize:12,color:textPrimary,display:"inline-flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
                  <span style={{fontWeight:"bold"}}>🍼 {lastFeeding.time}</span>
                  {lastFeedingAgo && <span style={{color:textSecondary}}>· il y a {lastFeedingAgo}</span>}
                  {lastFeedingNext && <span style={{color:dark?"#f48fb1":"#e06b8a",fontWeight:"bold"}}>· prochain {lastFeedingNext}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav tabs — always visible */}
        <div style={{display:"flex", borderTop:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.08)"}`, marginTop:4}}>
          {[["profil","👶"],["journal","📓"],["croissance","📏"],["sante","🏥"]].map(([key,icon])=>{
            const label = {profil:"Profil",journal:"Journal",croissance:"Croissance",sante:"Santé"}[key];
            const urgentAppts = appointments.filter(a => {
              if (a.done) return false;
              const elapsed = daysUntil(a.date, a.time);
              const calDays = calendarDaysUntil(a.date);
              return elapsed >= 0 && calDays <= 3;
            }).length;
            return (
              <button key={key} onClick={()=>handleTabChange(key)} style={{flex:1,padding:"8px 0 6px",border:"none",background:"transparent",cursor:"pointer",borderBottom:tab===key?`3px solid ${dark?"#f48fb1":"#e8906a"}`:"3px solid transparent",transition:"all 0.15s",position:"relative"}}>
                <div style={{fontSize:16}}>{icon}</div>
                <div style={{fontSize:10,color:tab===key?textPrimary:(dark?"#888":"#b05a30"),fontWeight:tab===key?"bold":"normal"}}>{label}</div>
                {key==="sante" && urgentAppts > 0 && (
                  <div style={{position:"absolute",top:4,right:"18%",background:"#e53935",color:"white",borderRadius:"50%",width:16,height:16,fontSize:10,fontWeight:"bold",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {urgentAppts}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:cardBg,borderRadius:20,padding:28,maxWidth:320,width:"100%",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:40,marginBottom:12}}>🗑️</div>
            <h3 style={{margin:"0 0 10px",color:textPrimary,fontSize:17}}>{confirmDelete.message}</h3>
            <p style={{color:"#8a6a5a",fontSize:13,margin:"0 0 20px"}}>Cette action est irréversible.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDelete(null)} style={btnSecondaryBase}>Annuler</button>
              <button onClick={()=>{confirmDelete.onConfirm();setConfirmDelete(null);}} style={{...btnPrimaryBase,background:"#e53935",flex:2}}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Import confirm */}
      {showImportConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:cardBg,borderRadius:20,padding:28,maxWidth:340,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
            <h3 style={{margin:"0 0 10px",color:textPrimary}}>Remplacer les données ?</h3>
            <p style={{color:"#8a6a5a",fontSize:14,margin:"0 0 20px"}}>Ceci remplacera tous tes boires actuels ({pendingImport?.length} entrées).</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowImportConfirm(false);setPendingImport(null);}} style={btnSecondaryBase}>Annuler</button>
              <button onClick={confirmImport} style={{...btnPrimaryBase,background:"#e06b8a"}}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: PROFIL
      ══════════════════════════════════════════════════ */}
      {tab==="profil" && (
        <ProfileTab
          profile={profile}
          saveProfile={saveProfile}
          dark={dark}
          cardBg={cardBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          dynInputStyle={dynInputStyle}
          todayStr={todayStr}
        />
      )}

      {/* ══════════════════════════════════════════════════
          TAB: JOURNAL
      ══════════════════════════════════════════════════ */}
      {tab==="journal" && (
        <div>
          {/* Timer bar */}
          <div style={{background: dark?"#2a2a3e":"#fff8f0",padding:"12px 16px",borderBottom:`1px solid ${dark?"#3a3a5e":"#f0d5c0"}`,display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:480,margin:"0 auto"}}>
            <div>
              <div style={{fontSize:12,color:textSecondary,fontWeight:"bold"}}>⏱ Minuterie boire</div>
              <div style={{fontSize:26,fontWeight:"bold",color:timerRunning?(dark?"#f48fb1":"#e06b8a"):textPrimary,letterSpacing:2}}>
                {String(Math.floor(timerSeconds/3600)).padStart(2,"0")}:{String(Math.floor((timerSeconds%3600)/60)).padStart(2,"0")}:{String(timerSeconds%60).padStart(2,"0")}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setTimerRunning(v=>!v)} style={{padding:"8px 18px",borderRadius:20,border:"none",background: timerRunning?"#e06b8a":"#e8906a",color:"white",fontWeight:"bold",fontSize:14,cursor:"pointer"}}>
                {timerRunning?"⏸ Pause":"▶ Démarrer"}
              </button>
              <button onClick={()=>{setTimerRunning(false);setTimerSeconds(0);}} style={{padding:"8px 12px",borderRadius:20,border:`1.5px solid ${borderColor}`,background:"transparent",color:textSecondary,fontWeight:"bold",fontSize:13,cursor:"pointer"}}>↺</button>
            </div>
          </div>

          {/* View toggle + add */}
          <div style={{padding:"14px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,maxWidth:480,margin:"0 auto"}}>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setSummaryOnly(v=>!v)} style={{padding:"7px 12px",borderRadius:20,border:`1.5px solid ${summaryOnly?(dark?"#f48fb1":"#e8906a"):borderColor}`,background:summaryOnly?(dark?"rgba(244,143,177,0.15)":"rgba(232,144,106,0.1)"):"transparent",color:summaryOnly?(dark?"#f48fb1":"#e8906a"):textSecondary,fontWeight:"bold",fontSize:12,cursor:"pointer"}}>
                📋{summaryOnly?" ✓":""}
              </button>
              <button onClick={()=>setShowStats(v=>!v)} style={{padding:"7px 12px",borderRadius:20,border:`1.5px solid ${showStats?(dark?"#90caf9":"#1565c0"):borderColor}`,background:showStats?(dark?"rgba(144,202,249,0.15)":"rgba(21,101,192,0.08)"):"transparent",color:showStats?(dark?"#90caf9":"#1565c0"):textSecondary,fontWeight:"bold",fontSize:12,cursor:"pointer"}}>
                📊{showStats?" ✓":""}
              </button>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setCoucheForm({date:todayStr(),time:getNow(),pipi:false,caca:false,note:""});setShowCoucheForm(true);}}
                style={{background: dark?"#2a3a4a":"#e3f2fd",color: dark?"#90caf9":"#1565c0",border:`1.5px solid ${dark?"#3a5a7a":"#90caf9"}`,borderRadius:50,padding:"11px 18px",fontSize:15,fontWeight:"bold",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                🧷 Couche
              </button>
              <button onClick={()=>{setForm({...initialForm,date:todayStr(),time:getNow()});setShowForm(true);setEditId(null);}}
                style={{background:"linear-gradient(135deg,#e8906a,#e06b8a)",color:"white",border:"none",borderRadius:50,padding:"11px 22px",fontSize:15,fontWeight:"bold",cursor:"pointer",boxShadow:"0 4px 16px rgba(232,144,106,0.4)",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:18}}>+</span> Boire
              </button>
            </div>
          </div>

          {/* Stats panel */}
          {showStats && (
            <div style={{padding:"12px 16px 0",maxWidth:480,margin:"0 auto"}}>
              <div style={{background:cardBg,borderRadius:14,padding:14,boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
                <div style={{fontSize:12,fontWeight:"bold",color:textPrimary,marginBottom:10}}>📊 Statistiques globales</div>
                {(() => {
                  const boireEntries=feedings.filter(f=>f._type!=="couche");
                  const total=boireEntries.length;
                  const days=[...new Set(feedings.map(f=>f.date))].length;
                  const avgPerDay=days>0?(total/days).toFixed(1):0;
                  const totalPipi=feedings.filter(f=>f.pipi).length;
                  const totalCaca=feedings.filter(f=>f.caca).length;
                  const avgPipi=days>0?(totalPipi/days).toFixed(1):0;
                  const avgCaca=days>0?(totalCaca/days).toFixed(1):0;
                  const complMat=boireEntries.reduce((s,f)=>{
                    const legacy=(f.complementType==="maternel")?(parseFloat(f.complement)||0):0;
                    return s+(parseFloat(f.complMaternel)||0)+legacy;
                  },0);
                  const complComm=boireEntries.reduce((s,f)=>{
                    const legacy=(f.complementType==="commercial")?(parseFloat(f.complement)||0):0;
                    return s+(parseFloat(f.complCommercial)||0)+legacy;
                  },0);
                  const totalCompl=complMat+complComm;
                  return (
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {/* Boires */}
                      <div style={{flex:"1 1 100%",background:dark?"#1a1a2e":"#fdebd0",borderRadius:10,padding:"10px 14px"}}>
                        <div style={{fontSize:11,fontWeight:"bold",color:textSecondary,marginBottom:6}}>🍼 Boires</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <span style={{background:dark?"#3a2a10":"#fff",borderRadius:20,padding:"3px 10px",fontSize:12,color:textPrimary,fontWeight:"bold"}}>🍼 {total} total</span>
                          <span style={{background:dark?"#3a2a10":"#fff",borderRadius:20,padding:"3px 10px",fontSize:12,color:textPrimary,fontWeight:"bold"}}>📅 {days} jours</span>
                          <span style={{background:dark?"#3a2a10":"#fff",borderRadius:20,padding:"3px 10px",fontSize:12,color:textPrimary,fontWeight:"bold"}}>📈 {avgPerDay}/jour</span>
                        </div>
                      </div>
                      {/* Couches */}
                      <div style={{flex:"1 1 100%",background:dark?"#1a1a2e":"#fdf6f0",borderRadius:10,padding:"10px 14px"}}>
                        <div style={{fontSize:11,fontWeight:"bold",color:textSecondary,marginBottom:6}}>🧷 Couches</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <span style={{background:dark?"#1a3050":"#ddeeff",borderRadius:20,padding:"3px 10px",fontSize:12,color:dark?"#90caf9":"#1565c0",fontWeight:"bold"}}>💧 {totalPipi} pipis · {avgPipi}/j</span>
                          <span style={{background:dark?"#3a2a10":"#fdebd0",borderRadius:20,padding:"3px 10px",fontSize:12,color:dark?"#ffcc80":"#e65100",fontWeight:"bold"}}>💩 {totalCaca} cacas · {avgCaca}/j</span>
                        </div>
                      </div>
                      {/* Compléments */}
                      {totalCompl>0 && (
                        <div style={{flex:"1 1 100%",background:dark?"#1a1a2e":"#fdf6f0",borderRadius:10,padding:"10px 14px"}}>
                          <div style={{fontSize:11,fontWeight:"bold",color:textSecondary,marginBottom:6}}>🥛 Compléments</div>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            {complMat>0&&<span style={{background:dark?"#3a1a2a":"#f9c6d8",borderRadius:20,padding:"3px 10px",fontSize:12,color:dark?"#f48fb1":"#c2185b",fontWeight:"bold"}}>🤱 {complMat.toFixed(0)} ml maternel</span>}
                            {complComm>0&&<span style={{background:dark?"#1a2a3a":"#e3f2fd",borderRadius:20,padding:"3px 10px",fontSize:12,color:dark?"#90caf9":"#1565c0",fontWeight:"bold"}}>🏭 {complComm.toFixed(0)} ml commercial</span>}
                            <span style={{background:dark?"#2a2a2a":"#f5f5f5",borderRadius:20,padding:"3px 10px",fontSize:12,color:textSecondary,fontWeight:"bold"}}>= {totalCompl.toFixed(0)} ml total</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          <div style={{padding:"14px 16px 0",maxWidth:480,margin:"0 auto"}}>
            {sortedDates.length===0 && (
              <div style={{textAlign:"center",color:"#c9a07a",marginTop:60,fontSize:15}}>
                <div style={{fontSize:48,marginBottom:12}}>🌸</div>
                Aucun boire enregistré.<br/><span style={{fontSize:13}}>Appuie sur « Nouveau boire ».</span>
              </div>
            )}
            {sortedDates.map(date=>(
              <div key={date} style={{marginBottom:28}}>
                <div style={{background: dark?"linear-gradient(90deg,#3a2a4e,#2a3a4e)":"linear-gradient(90deg,#f5c6a0,#f9a8c0)",borderRadius:14,padding:"12px 18px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>
                  <h2 style={{margin:0,fontSize:15,color:textPrimary,textTransform:"capitalize",fontWeight:"bold"}}>📅 {formatDate(date)}</h2>
                  <DaySummary entries={grouped[date]} dark={dark}/>
                </div>
                {!summaryOnly && grouped[date].sort((a,b)=>b.time.localeCompare(a.time)).map(f=>(
                  f._type === "couche"
                    ? <CoucheCard key={f.id} f={f} onDelete={()=>handleDelete(f.id)} dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary}/>
                    : <FeedingCard key={f.id} f={f} onEdit={()=>handleEdit(f)} onDelete={()=>handleDelete(f.id)} dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary}/>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: CROISSANCE
      ══════════════════════════════════════════════════ */}
      {tab==="croissance" && (
        <GrowthTab growth={growth} setGrowth={setGrowth} setShowGrowthForm={setShowGrowthForm} onEdit={handleEditGrowth} profile={profile} dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} dynCardStyle={dynCardStyle} setConfirmDelete={setConfirmDelete} />
      )}

      {tab==="sante" && (
        <SanteTab
          appointments={appointments}
          setAppointments={setAppointments}
          dark={dark} cardBg={cardBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          dynCardStyle={dynCardStyle}
          babyName={profile.nom || settings.babyName}
          showToast={showToast}
          dynInputStyle={dynInputStyle}
          setConfirmDelete={setConfirmDelete}
        />
      )}

      {/* ══════════════════════════════════════════════════
          TAB: OPTIONS
      ══════════════════════════════════════════════════ */}
      {tab==="options" && (
        <div style={{padding:"16px",maxWidth:480,margin:"0 auto"}}>
          <h2 style={{margin:"0 0 16px",fontSize:18,color:textPrimary}}>⚙️ Options</h2>

          {/* Dark mode */}
          <SectionCard dark={dark} cardBg={cardBg}>
            <div style={{fontSize:13,fontWeight:"bold",color:textPrimary,marginBottom:10}}>🌙 Mode nuit</div>
            <div style={{display:"flex",gap:8}}>
              {[
                {val:"off",  label:"☀️ Off"},
                {val:"on",   label:"🌙 On"},
                {val:"auto", label:"🌓 Auto", sub:"20h – 6h"},
              ].map(opt=>(
                <button key={opt.val} onClick={()=>saveSettings({...settings,darkMode:opt.val})}
                  style={{flex:1,padding:"10px 4px",borderRadius:12,border:"2px solid",
                    borderColor:darkModeSetting===opt.val?"#e06b8a":"#ddd",
                    background:darkModeSetting===opt.val?(dark?"rgba(224,107,138,0.25)":"#fce4ec"):(dark?"#1e1e30":"#fafafa"),
                    color:darkModeSetting===opt.val?"#c2185b":(dark?"#666":"#aaa"),
                    fontWeight:"bold",fontSize:13,cursor:"pointer",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span>{opt.label}</span>
                  {opt.sub && <span style={{fontSize:10,fontWeight:"normal",opacity:0.8}}>{opt.sub}</span>}
                </button>
              ))}
            </div>
            {darkModeSetting==="auto" && (
              <div style={{marginTop:8,fontSize:12,color:textSecondary,textAlign:"center"}}>
                {dark ? "🌙 Mode nuit actif" : "☀️ Mode jour actif"}
              </div>
            )}
          </SectionCard>

          {/* Import/Export */}
          <SectionCard dark={dark} cardBg={cardBg}>
            <div style={{fontSize:13,fontWeight:"bold",color:textPrimary,marginBottom:12}}>💾 Données</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={handleExport} style={{...btnOptionStyle(dark),borderColor:"#e8906a",color:"#e8906a"}}>📤 Exporter (JSON)</button>
              <button onClick={handleExportCSV} style={{...btnOptionStyle(dark),borderColor:"#4caf50",color:"#4caf50"}}>📊 Exporter (CSV / Excel)</button>
              <button onClick={handleExportPDF} style={{...btnOptionStyle(dark),borderColor:"#2196f3",color:"#2196f3"}}>🖨️ Imprimer / Exporter PDF</button>
              <button onClick={()=>importRef.current.click()} style={{...btnOptionStyle(dark),borderColor:"#9c27b0",color:"#9c27b0"}}>📂 Importer (JSON)</button>
            </div>
          </SectionCard>

          {/* Version */}
          <div style={{textAlign:"center",padding:"8px 0",fontSize:12,color:dark?"#444":"#ccc",fontFamily:"monospace"}}>
            v{APP_VERSION}
          </div>

        </div>
      )}

      {/* ── Couche Form Modal ── */}
      {showCoucheForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:cardBg,borderRadius:"24px 24px 0 0",padding:"28px 20px 40px",width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}>
            <h2 style={{margin:"0 0 20px",color:textPrimary,fontSize:20,textAlign:"center"}}>🧷 Changement de couche</h2>
            <Label dark={dark}>📅 Journée</Label>
            <input type="date" value={coucheForm.date} max={todayStr()} onChange={e=>setCoucheForm(f=>({...f,date:e.target.value}))} style={dynInputStyle}/>
            <Label dark={dark}>🕐 Heure</Label>
            <input type="time" value={coucheForm.time} onChange={e=>setCoucheForm(f=>({...f,time:e.target.value}))} style={dynInputStyle}/>
            <Label dark={dark}>Contenu de la couche</Label>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <button onClick={()=>setCoucheForm(f=>({...f,pipi:!f.pipi}))} style={{flex:1,padding:"14px 0",borderRadius:10,border:"2px solid",borderColor:coucheForm.pipi?"#7eb8f5":"#ddd",background:coucheForm.pipi?(dark?"rgba(126,184,245,0.2)":"#ddeeff"):(dark?"#1e1e30":"#fafafa"),color:coucheForm.pipi?(dark?"#90caf9":"#1565c0"):(dark?"#555":"#aaa"),fontWeight:"bold",fontSize:16,cursor:"pointer"}}>
                💧 Pipi
              </button>
              <button onClick={()=>setCoucheForm(f=>({...f,caca:!f.caca}))} style={{flex:1,padding:"14px 0",borderRadius:10,border:"2px solid",borderColor:coucheForm.caca?"#c9a96e":"#ddd",background:coucheForm.caca?(dark?"rgba(201,169,110,0.2)":"#fdebd0"):(dark?"#1e1e30":"#fafafa"),color:coucheForm.caca?(dark?"#ffcc80":"#e65100"):(dark?"#555":"#aaa"),fontWeight:"bold",fontSize:16,cursor:"pointer"}}>
                💩 Caca
              </button>
            </div>
            <Label dark={dark}>📝 Note (optionnel)</Label>
            <textarea placeholder="Observations..." value={coucheForm.note} onChange={e=>setCoucheForm(f=>({...f,note:e.target.value}))} rows={2} style={{...dynInputStyle,resize:"vertical",minHeight:60}}/>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>{setShowCoucheForm(false);onFormClose?.();}} style={btnSecondaryBase}>Annuler</button>
              <button onClick={handleAddCouche} style={btnPrimaryBase}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
      {showGrowthForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:cardBg,borderRadius:"24px 24px 0 0",padding:"28px 20px 40px",width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}>
            <h2 style={{margin:"0 0 20px",color:textPrimary,fontSize:20,textAlign:"center"}}>
              {growthEditId ? "✏️ Modifier la mesure" : "📏 Nouvelle mesure"}
            </h2>
            <Label dark={dark}>📅 Date</Label>
            <input type="date" value={growthForm.date} max={todayStr()} onChange={e=>setGrowthForm(f=>({...f,date:e.target.value}))} style={dynInputStyle}/>

            <Label dark={dark}>⚖️ Poids — unité de saisie</Label>
            <div style={{display:"flex",borderRadius:20,overflow:"hidden",border:`2px solid ${dark?"#3a3a5e":"#e8c5a8"}`,marginBottom:10,width:"fit-content"}}>
              {[["g","Grammes (g)"],["lb","Livres (lb)"]].map(([unit,label])=>(
                <button key={unit} onClick={()=>{
                  // convert current value when switching unit
                  if (growthForm.poids) {
                    const val = parseFloat(growthForm.poids);
                    if (unit==="lb" && growthInputUnit==="g") setGrowthForm(f=>({...f,poids:(val/453.592).toFixed(2)}));
                    if (unit==="g" && growthInputUnit==="lb") setGrowthForm(f=>({...f,poids:(val*453.592).toFixed(0)}));
                  }
                  setGrowthInputUnit(unit);
                }} style={{padding:"6px 18px",border:"none",background: growthInputUnit===unit?"#e8906a":(dark?"#1e1e30":"#fafafa"),color: growthInputUnit===unit?"white":(dark?"#888":"#aaa"),fontWeight:"bold",fontSize:13,cursor:"pointer",transition:"all 0.15s"}}>
                  {label}
                </button>
              ))}
            </div>
            <input type="number" min="0" step={growthInputUnit==="lb"?"0.01":"1"} placeholder={growthInputUnit==="lb"?"ex: 7.72":"ex: 3500"} value={growthForm.poids} onChange={e=>setGrowthForm(f=>({...f,poids:e.target.value}))} style={dynInputStyle}/>

            <Label dark={dark}>📏 Taille (cm)</Label>
            <input type="number" min="0" step="0.1" placeholder="ex: 52.5" value={growthForm.taille} onChange={e=>setGrowthForm(f=>({...f,taille:e.target.value}))} style={dynInputStyle}/>
            <Label dark={dark}>🔵 Périmètre crânien (cm)</Label>
            <input type="number" min="0" step="0.1" placeholder="ex: 36.0" value={growthForm.crane||""} onChange={e=>setGrowthForm(f=>({...f,crane:e.target.value}))} style={dynInputStyle}/>
            <Label dark={dark}>📝 Note</Label>
            <textarea placeholder="Observations..." value={growthForm.note} onChange={e=>setGrowthForm(f=>({...f,note:e.target.value}))} rows={2} style={{...dynInputStyle,resize:"vertical",minHeight:60}}/>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>{setShowGrowthForm(false);setGrowthEditId(null);setGrowthForm({date:todayStr(),poids:"",taille:"",crane:"",note:""});}} style={btnSecondaryBase}>Annuler</button>
              <button onClick={handleAddGrowth} style={btnPrimaryBase}>{growthEditId?"Enregistrer":"Ajouter"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feeding Form Modal ── */}
      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:cardBg,borderRadius:"24px 24px 0 0",padding:"28px 20px 40px",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}>
            <h2 style={{margin:"0 0 20px",color:textPrimary,fontSize:20,textAlign:"center"}}>{editId?"Modifier le boire":"Nouveau boire"}</h2>

            <Label dark={dark}>📅 Journée</Label>
            <input type="date" value={form.date} max={todayStr()} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={dynInputStyle}/>

            <Label dark={dark}>🕐 Heure</Label>
            <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={dynInputStyle}/>

            <Label dark={dark}>⏱ Durée du boire</Label>
            <div style={{display:"flex",gap:10,marginBottom:6}}>
              <select value={form.durationH} onChange={e=>setForm(f=>({...f,durationH:parseInt(e.target.value)}))} style={{...dynInputStyle,flex:1}}>
                {HOURS_OPTIONS.map(h=><option key={h} value={h}>{h}h</option>)}
              </select>
              <select value={form.durationM} onChange={e=>setForm(f=>({...f,durationM:parseInt(e.target.value)}))} style={{...dynInputStyle,flex:1}}>
                {MINUTES_OPTIONS.map(m=><option key={m} value={m}>{String(m).padStart(2,"0")} min</option>)}
              </select>
            </div>
            {durationTotalMins>0&&(
              <div style={{marginTop:-8,marginBottom:12,fontSize:13,color:textSecondary,paddingLeft:4}}>
                ➜ Prochain boire vers <strong>{getNextFeedingTime(form.time,durationTotalMins)}</strong>
              </div>
            )}

            <Label dark={dark}>🤱 Sein de départ</Label>
            <div style={{display:"flex",gap:10,marginBottom:6}}>
              {["gauche","droite"].map(sein=>{
                const isFirst=form.seinPremier===sein, isSecond=form.seinPremier!==null&&form.seinPremier!==sein;
                return (
                  <button key={sein} onClick={()=>setForm(f=>({...f,seinPremier:f.seinPremier===sein?null:sein}))}
                    style={{flex:1,padding:"12px 0",borderRadius:10,border:"2px solid",borderColor:isFirst?"#e06b8a":isSecond?"#e8c5a8":"#ddd",background:isFirst?"#fce4ec":isSecond?(dark?"#2a2020":"#fdf6f0"):(dark?"#1e1e30":"#fafafa"),cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{fontSize:13,fontWeight:"bold",color:isFirst?"#c2185b":isSecond?"#b05a30":"#aaa"}}>{sein==="gauche"?"◀ Gauche":"Droite ▶"}</span>
                    {isFirst&&<span style={{fontSize:11,background:"#e06b8a",color:"white",borderRadius:20,padding:"1px 8px",fontWeight:"bold"}}>1er</span>}
                    {isSecond&&<span style={{fontSize:11,background:"#e8c5a8",color:"#7a3b1e",borderRadius:20,padding:"1px 8px",fontWeight:"bold"}}>2e</span>}
                    {!isFirst&&!isSecond&&<span style={{fontSize:11,color:"#ccc"}}>—</span>}
                  </button>
                );
              })}
            </div>
            {form.seinPremier&&<div style={{fontSize:12,color:textSecondary,marginBottom:14,paddingLeft:4}}>Départ : <strong>{form.seinPremier}</strong> → suite : <strong>{form.seinPremier==="gauche"?"droite":"gauche"}</strong></div>}
            {!form.seinPremier&&<div style={{marginBottom:14}}/>}

            <Label dark={dark}>🥛 Complément de lait</Label>
            <div style={{display:"flex",gap:10,marginBottom:6}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:"bold",color:"#c2185b",marginBottom:4}}>🤱 Maternel (ml)</div>
                <input type="number" min="0" placeholder="ex: 30" value={form.complMaternel}
                  onChange={e=>setForm(f=>({...f,complMaternel:e.target.value}))}
                  style={{...dynInputStyle, borderColor:"#f9c6d8", marginBottom:0}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:"bold",color:"#1565c0",marginBottom:4}}>🏭 Commercial (ml)</div>
                <input type="number" min="0" placeholder="ex: 30" value={form.complCommercial}
                  onChange={e=>setForm(f=>({...f,complCommercial:e.target.value}))}
                  style={{...dynInputStyle, borderColor:"#bbdefb", marginBottom:0}}/>
              </div>
            </div>
            {(parseFloat(form.complMaternel)||0)+(parseFloat(form.complCommercial)||0) > 0 && (
              <div style={{fontSize:12,color:textSecondary,marginBottom:14,paddingLeft:2}}>
                Total : <strong>{((parseFloat(form.complMaternel)||0)+(parseFloat(form.complCommercial)||0)).toFixed(0)} ml</strong>
              </div>
            )}
            {!(parseFloat(form.complMaternel)||0) && !(parseFloat(form.complCommercial)||0) && <div style={{marginBottom:14}}/>}

            <Label dark={dark}>🧷 Couche</Label>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <ToggleBtn active={form.pipi} onClick={()=>setForm(f=>({...f,pipi:!f.pipi}))} label="💧 Pipi" color="#7eb8f5" dark={dark}/>
              <ToggleBtn active={form.caca} onClick={()=>setForm(f=>({...f,caca:!f.caca}))} label="💩 Caca" color="#c9a96e" dark={dark}/>
            </div>

            <Label dark={dark}>🌿 Soins</Label>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              <ToggleBtn active={form.vitamineD} onClick={()=>setForm(f=>({...f,vitamineD:!f.vitamineD}))} label="☀️ Vitamine D donnée" color="#ffe082" fullWidth dark={dark}/>
              <div style={{display:"flex",gap:10}}>
                <ToggleBtn active={form.nombril} onClick={()=>setForm(f=>({...f,nombril:!f.nombril}))} label="🫧 Nombril" color="#a5d6a7" dark={dark}/>
                <ToggleBtn active={form.yeux} onClick={()=>setForm(f=>({...f,yeux:!f.yeux}))} label="👁️ Yeux" color="#ce93d8" dark={dark}/>
              </div>
            </div>

            <Label dark={dark}>📝 Note</Label>
            <textarea placeholder="Observations..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={3} style={{...dynInputStyle,resize:"vertical",minHeight:70}}/>

            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={cancelForm} style={btnSecondaryBase}>Annuler</button>
              <button onClick={handleSubmit} style={btnPrimaryBase}>{editId?"Enregistrer":"Ajouter"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
// ── CoucheCard ───────────────────────────────────────────────────────────────
function CoucheCard({ f, onDelete, dark, cardBg, textPrimary, textSecondary }) {
  return (
    <div style={{background: dark?"#1e2a1e":"#f0faf0", borderRadius:16, padding:"12px 16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", borderLeft:"4px solid #78c878", display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <span style={{fontSize:18,fontWeight:"bold",color:textPrimary}}>{f.time}</span>
          <span style={{fontSize:12,background: dark?"#1a3020":"#e8f5e9",borderRadius:20,padding:"2px 10px",color: dark?"#a5d6a7":"#2e7d32",fontWeight:"bold"}}>🧷 Couche</span>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {f.pipi && <span style={{background: dark?"#1a3050":"#ddeeff",borderRadius:20,padding:"3px 10px",fontSize:12,color: dark?"#90caf9":"#1565c0",fontWeight:"bold"}}>💧 Pipi</span>}
          {f.caca && <span style={{background: dark?"#3a2a10":"#fdebd0",borderRadius:20,padding:"3px 10px",fontSize:12,color: dark?"#ffcc80":"#e65100",fontWeight:"bold"}}>💩 Caca</span>}
        </div>
        {f.note && <div style={{marginTop:6,fontSize:12,color:"#8a6a5a",fontStyle:"italic"}}>"{f.note}"</div>}
      </div>
      <button onClick={onDelete} style={{background:"#fff0f0",border:"none",borderRadius:8,width:32,height:32,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>🗑️</button>
    </div>
  );
}

function FeedingCard({f, onEdit, onDelete, dark, cardBg, textPrimary, textSecondary}) {
  const dH=(parseInt(f.durationH)||0), dM=(parseInt(f.durationM)||0);
  const totalMins=dH*60+dM||(parseInt(f.duration)||0);
  const next=getNextFeedingTime(f.time, totalMins||null);
  const durationLabel=formatDuration(totalMins);
  let seinTag=null;
  if(f.seinPremier){const s2=f.seinPremier==="gauche"?"droite":"gauche"; seinTag=<Tag color="#f9c6d8" dark={dark}>🤱 {f.seinPremier} → {s2}</Tag>;}
  else if(f.seinGauche||f.seinDroit){seinTag=<Tag color="#f9c6d8" dark={dark}>🤱 {f.seinGauche?"Gauche":"Droite"}</Tag>;}
  return (
    <div style={{background:cardBg,borderRadius:16,padding:"16px",marginBottom:12,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",borderLeft:"4px solid #e8906a"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <span style={{fontSize:22,fontWeight:"bold",color:textPrimary}}>{f.time}</span>
          {durationLabel&&<span style={{fontSize:12,color:textSecondary,marginLeft:8,background: dark?"#3a2a10":"#fef0e6",borderRadius:20,padding:"2px 10px"}}>{durationLabel}</span>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <ActionBtn onClick={onEdit} label="✏️"/>
          <ActionBtn onClick={onDelete} label="🗑️" danger/>
        </div>
      </div>
      {next&&<div style={{fontSize:12,color:"#e06b8a",marginBottom:8,fontWeight:"bold"}}>⏰ Prochain boire vers {next}</div>}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:f.note?10:0}}>
        {seinTag}
        {/* Support both new dual fields and legacy single field */}
        {(parseFloat(f.complMaternel)||0) > 0 && <Tag color="#f9c6d8" dark={dark}>🤱 {f.complMaternel} ml mat.</Tag>}
        {(parseFloat(f.complCommercial)||0) > 0 && <Tag color="#d6eeff" dark={dark}>🏭 {f.complCommercial} ml comm.</Tag>}
        {/* Legacy fallback */}
        {!f.complMaternel && !f.complCommercial && f.complement && <Tag color={f.complementType==="maternel"?"#f9c6d8":"#d6eeff"} dark={dark}>{f.complementType==="maternel"?"🤱":"🥛"} {f.complement} ml</Tag>}
        {f.pipi&&<Tag color="#ddeeff" dark={dark}>💧 Pipi</Tag>}
        {f.caca&&<Tag color="#fdebd0" dark={dark}>💩 Caca</Tag>}
        {f.vitamineD&&<Tag color="#fff9c4" dark={dark}>☀️ Vit. D</Tag>}
        {f.nombril&&<Tag color="#e8f5e9" dark={dark}>🫧 Nombril</Tag>}
        {f.yeux&&<Tag color="#f3e5f5" dark={dark}>👁️ Yeux</Tag>}
        {!seinTag&&!f.complement&&!f.pipi&&!f.caca&&!f.vitamineD&&!f.nombril&&!f.yeux&&<span style={{fontSize:12,color:"#ccc"}}>Aucun détail</span>}
      </div>
      {f.note&&<div style={{marginTop:6,fontSize:13,color:"#8a6a5a",background: dark?"#1a1a2e":"#fdf6f0",borderRadius:8,padding:"8px 10px",borderLeft:"3px solid #f5c6a0",fontStyle:"italic"}}>"{f.note}"</div>}
    </div>
  );
}

function SectionCard({children, dark, cardBg}) {
  return <div style={{background:cardBg,borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>{children}</div>;
}
function Label({children, dark}) {
  return <div style={{fontSize:13,fontWeight:"bold",color: dark?"#f5c6a0":"#7a3b1e",marginBottom:6}}>{children}</div>;
}
function Tag({children,color,dark}) {
  return <span style={{background: dark?(color+"33"):color,borderRadius:20,padding:"3px 10px",fontSize:12,color: dark?"#f5deb3":"#5a3020",fontWeight:"bold"}}>{children}</span>;
}
function ToggleBtn({active,onClick,label,color,fullWidth,dark}) {
  return <button onClick={onClick} style={{flex:fullWidth?"unset":1,width:fullWidth?"100%":undefined,padding:"10px 0",borderRadius:10,border:"2px solid",borderColor:active?(color||"#e8906a"):(dark?"#3a3a5e":"#ddd"),background:active?(color?(dark?color+"44":color+"55"):(dark?"#2a1a10":"#fff0e8")):(dark?"#1e1e30":"#fafafa"),color:active?(dark?"#f5deb3":"#5a3020"):(dark?"#555":"#aaa"),fontWeight:"bold",fontSize:14,cursor:"pointer",transition:"all 0.15s"}}>{label}</button>;
}
function ActionBtn({onClick,label,danger}) {
  return <button onClick={onClick} style={{background:danger?"#fff0f0":"#f0f8ff",border:"none",borderRadius:8,width:32,height:32,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{label}</button>;
}
function btnOptionStyle(dark) {
  return {width:"100%",padding:"11px 0",borderRadius:10,border:"2px solid",background: dark?"#1e1e30":"#fafafa",fontWeight:"bold",fontSize:14,cursor:"pointer"};
}

// ── GrowthTab with SVG line chart ────────────────────────────────────────────
function GrowthLineChart({ data, valueKey, color, unit, dark, whoTable, birthDate, weightUnit }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);
  const sorted = [...data].filter(d => d[valueKey]).sort((a,b) => a.date.localeCompare(b.date));

  if (sorted.length < 1) return (
    <div style={{textAlign:"center",color:"#aaa",fontSize:13,padding:"20px 0"}}>
      Ajoute au moins 1 mesure pour voir le graphique.
    </div>
  );

  // Build WHO reference points aligned to our data's age range
  const whoPoints = whoTable && birthDate ? (() => {
    const [by,bmo,bd] = birthDate.split("-").map(Number);
    const birthDt = new Date(by,bmo-1,bd);
    // Get age in months for each data point
    const ages = sorted.map(d => {
      if (d._isBirth) return 0;
      const [dy,dmo,dd] = d.date.split("-").map(Number);
      const dt = new Date(dy,dmo-1,dd);
      return (dt - birthDt) / (1000*60*60*24*30.44);
    });
    const minAge = Math.max(0, Math.min(...ages));
    const maxAge = Math.min(24, Math.max(...ages) + 1);
    // Sample WHO at regular intervals
    const steps = 20;
    const pts = [];
    for (let i=0; i<=steps; i++) {
      const age = minAge + (maxAge - minAge) * i / steps;
      const vals = whoInterpolate(whoTable, age);
      if (vals) pts.push({ age, vals });
    }
    return { pts, ages, minAge, maxAge };
  })() : null;

  const vals = sorted.map(d => parseFloat(d[valueKey]));

  // Include WHO data in min/max calculation for proper scaling
  let allVals = [...vals];
  if (whoPoints) {
    whoPoints.pts.forEach(p => {
      // Convert WHO kg to grams if needed
      const factor = unit === "g" ? 1000 : 1;
      allVals.push(p.vals[0]*factor, p.vals[4]*factor);
    });
  }
  const minV = Math.min(...allVals), maxV = Math.max(...allVals);
  const range = maxV - minV || 1;

  const W = 320, H = 170, padL = 44, padR = 12, padT = 16, padB = 28;
  const gW = W - padL - padR, gH = H - padT - padB;

  // X axis: use age in months if WHO available, else use index
  const useAgeX = !!(whoPoints && birthDate);

  const pxAge = (age) => {
    if (!whoPoints) return 0;
    const { minAge, maxAge } = whoPoints;
    return padL + ((age - minAge) / (maxAge - minAge)) * gW;
  };
  const pxIdx = (i) => padL + (i / Math.max(sorted.length - 1, 1)) * gW;
  const py = v => padT + gH - ((v - minV) / range) * gH;

  const textCol = dark ? "#aaa" : "#888";
  const gridCol = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const yLabels = [minV, minV+range/2, maxV].map(v => {
    if (unit==="g") return Math.round(v);
    return Math.round(v*10)/10;
  });

  const birthVal = sorted.find(d => d._isBirth) ? parseFloat(sorted.find(d => d._isBirth)[valueKey]) : null;

  // WHO line paths
  const whoLinePath = (pIdx) => {
    if (!whoPoints) return "";
    const factor = unit==="g" ? 1000 : 1;
    return whoPoints.pts.map((p,i) => {
      const x = pxAge(p.age);
      const y = py(p.vals[pIdx]*factor);
      return `${i===0?"M":"L"}${x},${y}`;
    }).join(" ");
  };

  const WHO_COLORS = [
    {pIdx:2, label:"P50", color:"#4caf50", dash:"none", opacity:0.8},
    {pIdx:1, label:"P15", color:"#ff9800", dash:"4,3", opacity:0.6},
    {pIdx:3, label:"P85", color:"#ff9800", dash:"4,3", opacity:0.6},
    {pIdx:0, label:"P3",  color:"#e53935", dash:"2,3", opacity:0.5},
    {pIdx:4, label:"P97", color:"#e53935", dash:"2,3", opacity:0.5},
  ];

  function handleDotClick(e, d, i, val, prevVal) {
    e.stopPropagation();
    if (tooltip?.i === i) { setTooltip(null); return; }
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const scaleX = svgRect.width / W;
    const scaleY = svgRect.height / H;
    const cx = useAgeX ? pxAge(whoPoints.ages[i]) : pxIdx(i);
    const screenX = svgRect.left + cx * scaleX;
    const screenY = svgRect.top + py(val) * scaleY + window.scrollY;
    // Compute percentile for this value
    let pct = null;
    if (whoPoints && whoTable) {
      const factor = unit==="g" ? 1000 : 1;
      const age = whoPoints.ages[i];
      const ref = whoInterpolate(whoTable, age);
      if (ref) {
        const refVals = ref.map(v => v*factor);
        if (val <= refVals[0]) pct = "< P3";
        else if (val <= refVals[1]) pct = "P3–P15";
        else if (val <= refVals[2]) pct = "P15–P50";
        else if (val <= refVals[3]) pct = "P50–P85";
        else if (val <= refVals[4]) pct = "P85–P97";
        else pct = "> P97";
      }
    }
    setTooltip({ i, d, val, prevVal, screenX, screenY, pct });
  }

  const dataPoints = sorted.map((d,i) => {
    const val = parseFloat(d[valueKey]);
    const prevVal = i > 0 ? parseFloat(sorted[i-1][valueKey]) : null;
    const cx = useAgeX ? pxAge(whoPoints.ages[i]) : pxIdx(i);
    return { d, i, val, prevVal, cx };
  });

  const linePoints = dataPoints.map(p => `${p.cx},${py(p.val)}`).join(" ");
  const areaPoints = `${dataPoints[0]?.cx},${padT+gH} ${linePoints} ${dataPoints[dataPoints.length-1]?.cx},${padT+gH}`;

  return (
    <div style={{overflowX:"auto", position:"relative"}}>
      {/* WHO legend */}
      {whoPoints && (
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:6,flexWrap:"wrap"}}>
          {[["P3/P97","#e53935"],["P15/P85","#ff9800"],["P50","#4caf50"]].map(([label,c])=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:textCol}}>
              <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke={c} strokeWidth={1.5} strokeDasharray={label==="P50"?"none":"4,2"}/></svg>
              {label}
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:textCol}}>
            <svg width={10} height={10}><circle cx={5} cy={5} r={4} fill={color}/></svg>
            Bébé
          </div>
        </div>
      )}

      <svg ref={svgRef} width={W} height={H} style={{display:"block",margin:"0 auto"}} onClick={()=>setTooltip(null)}>
        {/* Grid */}
        {yLabels.map((v,i)=>(
          <g key={i}>
            <line x1={padL} y1={py(v)} x2={W-padR} y2={py(v)} stroke={gridCol} strokeWidth={1}/>
            <text x={padL-4} y={py(v)+4} textAnchor="end" fontSize={9} fill={textCol}>{v}</text>
          </g>
        ))}

        {/* WHO reference lines */}
        {whoPoints && WHO_COLORS.map(({pIdx,color:wc,dash,opacity})=>(
          <path key={pIdx} d={whoLinePath(pIdx)} fill="none" stroke={wc}
            strokeWidth={pIdx===2?1.5:1} strokeDasharray={dash} opacity={opacity}/>
        ))}

        {/* Baby data area + line */}
        {sorted.length > 1 && <>
          <polygon points={areaPoints} fill={color} fillOpacity={0.15}/>
          <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
        </>}

        {/* Dots */}
        {dataPoints.map(({d,i,val,prevVal,cx})=>{
          const isSelected = tooltip?.i === i;
          return (
            <g key={i} onClick={e=>handleDotClick(e,d,i,val,prevVal)} style={{cursor:"pointer"}}>
              <circle cx={cx} cy={py(val)} r={14} fill="transparent"/>
              <circle cx={cx} cy={py(val)} r={isSelected?6:4}
                fill={isSelected?"white":color}
                stroke={isSelected?color:(dark?"#1a1a2e":"white")}
                strokeWidth={isSelected?3:2}/>
              <text x={cx} y={H-4} textAnchor="middle" fontSize={9} fill={isSelected?color:textCol}>
                {d._label||formatDateShort(d.date)}
              </text>
            </g>
          );
        })}
        <text x={padL-2} y={padT-4} fontSize={9} fill={textCol}>{unit}</text>
      </svg>

      {/* Tooltip */}
      {tooltip && createPortal((() => {
        const {val,prevVal,screenX,screenY,pct} = tooltip;
        const diff = prevVal!==null ? (val-prevVal) : null;
        const diffPct = prevVal!==null ? ((val-prevVal)/prevVal*100) : null;
        const birthPct2 = birthVal&&!tooltip.d._isBirth ? ((val-birthVal)/birthVal*100) : null;
        const label = tooltip.d._label||formatDateShort(tooltip.d.date);
        const bubbleW = 180;
        const left = Math.max(8, Math.min(screenX-bubbleW/2, window.innerWidth-bubbleW-8));
        const top = screenY - 16;
        return (
          <div onClick={()=>setTooltip(null)} style={{position:"absolute",top:top+"px",left:left+"px",transform:"translateY(-100%)",background:dark?"#2a2a3e":"white",border:`2px solid ${color}`,borderRadius:12,padding:"10px 14px",fontSize:12,color:dark?"#f5deb3":"#333",boxShadow:"0 4px 24px rgba(0,0,0,0.25)",zIndex:99999,width:bubbleW+"px",cursor:"pointer"}}>
            <div style={{fontWeight:"bold",color,marginBottom:4}}>{label}</div>
            <div style={{fontSize:15,fontWeight:"bold",marginBottom:4}}>{val.toFixed(unit==="g"?0:1)} {unit}</div>
            {pct && <div style={{background:dark?"#1a1a2e":"#f5f5f5",borderRadius:8,padding:"3px 8px",fontSize:11,fontWeight:"bold",color:"#333",marginBottom:4}}>📊 Percentile OMS : {pct}</div>}
            {diff!==null && <div style={{color:diff>=0?"#4caf50":"#e53935",marginBottom:2}}>{diff>=0?"▲":"▼"} {Math.abs(diff).toFixed(unit==="g"?0:1)} {unit} vs précédent</div>}
            {diffPct!==null && <div style={{color:diff>=0?"#4caf50":"#e53935",marginBottom:2}}>{diffPct>=0?"▲":"▼"} {Math.abs(diffPct).toFixed(1)}%</div>}
            {birthPct2!==null && <div style={{color:birthPct2>=0?"#1565c0":"#ff7043",fontSize:11,marginTop:4,borderTop:`1px solid ${dark?"#333":"#eee"}`,paddingTop:4}}>{birthPct2>=0?"▲":"▼"} {Math.abs(birthPct2).toFixed(1)}% vs naissance</div>}
          </div>
        );
      })(), document.body)}
    </div>
  );
}

function GrowthTab({ growth, setGrowth, setShowGrowthForm, onEdit, profile, dark, cardBg, textPrimary, textSecondary, dynCardStyle, setConfirmDelete }) {
  const [view, setView] = useState("graphique");
  const [metric, setMetric] = useState("poids");
  const [weightUnit, setWeightUnit] = useState("g");
  const [heightUnit, setHeightUnit] = useState("cm"); // "cm" | "ft"

  function toDisplayWeight(grams) {
    if (!grams) return null;
    if (weightUnit==="lb") return (parseFloat(grams)/453.592).toFixed(2);
    return parseFloat(grams);
  }
  function toDisplayHeight(cm) {
    if (!cm) return null;
    if (heightUnit==="ft") {
      const totalIn=parseFloat(cm)/2.54;
      const ft=Math.floor(totalIn/12);
      const inch=(totalIn%12).toFixed(1);
      return `${ft}' ${inch}"`;
    }
    return parseFloat(cm);
  }
  function weightUnitLabel() { return weightUnit==="lb"?"lb":"g"; }
  function heightUnitLabel() { return heightUnit==="ft"?"pi/po":"cm"; }
  function weightChange(changeG) {
    if (!changeG) return null;
    if (weightUnit==="lb") return (parseFloat(changeG)/453.592).toFixed(2);
    return changeG;
  }
  function heightChange(changeCm) {
    if (!changeCm) return null;
    if (heightUnit==="ft") return (parseFloat(changeCm)/2.54).toFixed(1)+" po";
    return changeCm+"cm";
  }

  // Build display data for chart — prepend birth data from profile if available
  const birthEntry = (profile?.poidsNaissance || profile?.tailleNaissance || profile?.perimCranien) ? {
    id: "__birth__",
    date: "0000-00-00",
    poids: profile.poidsNaissance || "",
    taille: profile.tailleNaissance || "",
    crane: profile.perimCranien || "",
    _isBirth: true,
  } : null;

  const allGrowth = birthEntry ? [birthEntry, ...growth] : growth;

  const displayGrowth = allGrowth.map(g => ({
    ...g,
    _poidsDisplay: g.poids ? String(toDisplayWeight(g.poids)) : "",
    _tailleDisplay: g.taille ? (heightUnit==="ft" ? String(parseFloat(g.taille)/2.54) : String(g.taille)) : "",
    _craneDisplay: g.crane ? String(parseFloat(g.crane)) : "",
    _label: g._isBirth ? "Naissance" : formatDateShort(g.date),
  }));

  const sorted = [...displayGrowth].sort((a,b) => a.date.localeCompare(b.date));
  const sortedGrowth = [...growth].sort((a,b) => b.date.localeCompare(a.date)); // newest first for list

  // Find latest value for each metric independently
  const latestPoids  = sortedGrowth.find(g => g.poids);
  const latestTaille = sortedGrowth.find(g => g.taille);
  const latestCrane  = sortedGrowth.find(g => g.crane);

  // Previous value for each metric (the entry just before the latest)
  const prevPoids  = sortedGrowth.filter(g => g.poids) [1] || null;
  const prevTaille = sortedGrowth.filter(g => g.taille)[1] || null;
  const prevCrane  = sortedGrowth.filter(g => g.crane) [1] || null;

  const poidsChangeG   = latestPoids&&prevPoids   ? (parseFloat(latestPoids.poids)  - parseFloat(prevPoids.poids)).toFixed(0)  : null;
  const tailleChangeCm = latestTaille&&prevTaille ? (parseFloat(latestTaille.taille)- parseFloat(prevTaille.taille)).toFixed(1): null;
  const craneChangeCm  = latestCrane&&prevCrane   ? (parseFloat(latestCrane.crane)  - parseFloat(prevCrane.crane)).toFixed(1)  : null;

  // % change vs birth from profile
  const birthPoids  = parseFloat(profile?.poidsNaissance)  || null;
  const birthTaille = parseFloat(profile?.tailleNaissance) || null;
  const poidsPct  = birthPoids&&latestPoids   ? (((parseFloat(latestPoids.poids)  - birthPoids)  / birthPoids)  * 100).toFixed(1) : null;
  const taillePct = birthTaille&&latestTaille ? (((parseFloat(latestTaille.taille)- birthTaille) / birthTaille) * 100).toFixed(1) : null;

  const hasAnyData = latestPoids || latestTaille || latestCrane;

  return (
    <div style={{padding:"16px", maxWidth:480, margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
        <h2 style={{margin:0, fontSize:18, color:textPrimary}}>📏 Croissance</h2>
        <button onClick={()=>setShowGrowthForm(true)} style={{background:"linear-gradient(135deg,#e8906a,#e06b8a)",color:"white",border:"none",borderRadius:50,padding:"9px 18px",fontSize:14,fontWeight:"bold",cursor:"pointer"}}>+ Mesure</button>
      </div>

      {/* Unit toggles */}
      <div style={{display:"flex", gap:10, marginBottom:14, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:12, color:textSecondary, fontWeight:"bold"}}>⚖️</span>
          <div style={{display:"flex", borderRadius:20, overflow:"hidden", border:`2px solid ${dark?"#3a3a5e":"#e8c5a8"}`}}>
            {[["g","g"],["lb","lb"]].map(([unit,label])=>(
              <button key={unit} onClick={()=>setWeightUnit(unit)} style={{padding:"4px 14px",border:"none",background:weightUnit===unit?"#e8906a":(dark?"#1e1e30":"#fafafa"),color:weightUnit===unit?"white":(dark?"#888":"#aaa"),fontWeight:"bold",fontSize:12,cursor:"pointer"}}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:12, color:textSecondary, fontWeight:"bold"}}>📏</span>
          <div style={{display:"flex", borderRadius:20, overflow:"hidden", border:`2px solid ${dark?"#3a3a5e":"#e8c5a8"}`}}>
            {[["cm","cm"],["ft","pi/po"]].map(([unit,label])=>(
              <button key={unit} onClick={()=>setHeightUnit(unit)} style={{padding:"4px 14px",border:"none",background:heightUnit===unit?"#1565c0":(dark?"#1e1e30":"#fafafa"),color:heightUnit===unit?"white":(dark?"#888":"#aaa"),fontWeight:"bold",fontSize:12,cursor:"pointer"}}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Birth reference from profile */}
      {(profile?.poidsNaissance || profile?.tailleNaissance || profile?.perimCranien) && (
        <div style={{background:dark?"#1a2a1a":"#e8f5e9",borderRadius:12,padding:"10px 14px",marginBottom:14,borderLeft:"4px solid #4caf50"}}>
          <div style={{fontSize:12,fontWeight:"bold",color:dark?"#a5d6a7":"#2e7d32",marginBottom:6}}>🏥 Données de naissance (profil)</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {profile.poidsNaissance && <span style={{background:dark?"#1a3020":"#c8e6c9",borderRadius:20,padding:"2px 10px",fontSize:12,color:dark?"#a5d6a7":"#1b5e20",fontWeight:"bold"}}>⚖️ {toDisplayWeight(profile.poidsNaissance)} {weightUnitLabel()}</span>}
            {profile.tailleNaissance && <span style={{background:dark?"#1a2a40":"#bbdefb",borderRadius:20,padding:"2px 10px",fontSize:12,color:dark?"#90caf9":"#0d47a1",fontWeight:"bold"}}>📏 {toDisplayHeight(profile.tailleNaissance)} {heightUnit==="cm"?"cm":""}</span>}
            {profile.perimCranien && <span style={{background:dark?"#2a1a2a":"#e1bee7",borderRadius:20,padding:"2px 10px",fontSize:12,color:dark?"#ce93d8":"#4a148c",fontWeight:"bold"}}>🔵 {profile.perimCranien} cm crâne</span>}
          </div>
        </div>
      )}

      {/* Latest stats — one card per metric, each with its own date */}
      {hasAnyData && (
        <div style={{background: dark?"#2a2a3e":"#fff8f0", borderRadius:16, padding:14, marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
          <div style={{fontSize:12, color:textSecondary, marginBottom:10, fontWeight:"bold"}}>📊 Dernières mesures</div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>

            {/* Poids */}
            {latestPoids && (
              <div style={{flex:"1 1 28%", background: dark?"#1a3020":"#e8f5e9", borderRadius:12, padding:"10px 10px", textAlign:"center", minWidth:90}}>
                <div style={{fontSize:10, color:dark?"#a5d6a7":"#2e7d32", marginBottom:3, fontWeight:"bold"}}>
                  ⚖️ {formatDateShort(latestPoids.date)}
                </div>
                <div style={{fontSize:18, fontWeight:"bold", color: dark?"#a5d6a7":"#2e7d32"}}>
                  {toDisplayWeight(latestPoids.poids)}<span style={{fontSize:10}}> {weightUnitLabel()}</span>
                </div>
                {poidsChangeG && (
                  <div style={{fontSize:10, color:parseFloat(poidsChangeG)>=0?"#4caf50":"#e53935", marginTop:2}}>
                    {parseFloat(poidsChangeG)>=0?"▲":"▼"} {Math.abs(poidsChangeG)}{weightUnitLabel()}
                  </div>
                )}
                {poidsPct !== null && (
                  <div style={{fontSize:10, marginTop:2, fontWeight:"bold", color:parseFloat(poidsPct)>=0?(dark?"#a5d6a7":"#2e7d32"):(dark?"#f48fb1":"#e53935")}}>
                    {parseFloat(poidsPct)>=0?"▲":"▼"} {Math.abs(poidsPct)}% naissance
                  </div>
                )}
              </div>
            )}

            {/* Taille */}
            {latestTaille && (
              <div style={{flex:"1 1 28%", background: dark?"#1a2a40":"#e3f2fd", borderRadius:12, padding:"10px 10px", textAlign:"center", minWidth:90}}>
                <div style={{fontSize:10, color:dark?"#90caf9":"#1565c0", marginBottom:3, fontWeight:"bold"}}>
                  📏 {formatDateShort(latestTaille.date)}
                </div>
                <div style={{fontSize:18, fontWeight:"bold", color: dark?"#90caf9":"#1565c0"}}>
                  {toDisplayHeight(latestTaille.taille)}
                </div>
                {tailleChangeCm && (
                  <div style={{fontSize:10, color:parseFloat(tailleChangeCm)>=0?"#4caf50":"#e53935", marginTop:2}}>
                    {parseFloat(tailleChangeCm)>=0?"▲":"▼"} {Math.abs(tailleChangeCm)}cm
                  </div>
                )}
                {taillePct !== null && (
                  <div style={{fontSize:10, marginTop:2, fontWeight:"bold", color:parseFloat(taillePct)>=0?(dark?"#90caf9":"#1565c0"):(dark?"#f48fb1":"#e53935")}}>
                    {parseFloat(taillePct)>=0?"▲":"▼"} {Math.abs(taillePct)}% naissance
                  </div>
                )}
              </div>
            )}

            {/* Crâne */}
            {latestCrane && (
              <div style={{flex:"1 1 28%", background: dark?"#2a1a3a":"#f3e5f5", borderRadius:12, padding:"10px 10px", textAlign:"center", minWidth:90}}>
                <div style={{fontSize:10, color:dark?"#ce93d8":"#6a1b9a", marginBottom:3, fontWeight:"bold"}}>
                  🔵 {formatDateShort(latestCrane.date)}
                </div>
                <div style={{fontSize:18, fontWeight:"bold", color: dark?"#ce93d8":"#6a1b9a"}}>
                  {parseFloat(latestCrane.crane).toFixed(1)}<span style={{fontSize:10}}> cm</span>
                </div>
                {craneChangeCm && (
                  <div style={{fontSize:10, color:parseFloat(craneChangeCm)>=0?"#4caf50":"#e53935", marginTop:2}}>
                    {parseFloat(craneChangeCm)>=0?"▲":"▼"} {Math.abs(craneChangeCm)}cm
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* View toggle */}
      <div style={{display:"flex", gap:8, marginBottom:14}}>
        {[["graphique","📈 Graphique"],["liste","📋 Liste"]].map(([key,label]) => (
          <button key={key} onClick={()=>setView(key)} style={{flex:1, padding:"9px 0", borderRadius:10, border:"2px solid", borderColor: view===key?"#e8906a":"#ddd", background: view===key?(dark?"rgba(232,144,106,0.15)":"#fff0e8"):(dark?"#1e1e30":"#fafafa"), color: view===key?"#e8906a":(dark?"#666":"#aaa"), fontWeight:"bold", fontSize:14, cursor:"pointer"}}>
            {label}
          </button>
        ))}
      </div>

      {growth.length === 0 && (
        <div style={{textAlign:"center", color:"#c9a07a", marginTop:40}}>
          <div style={{fontSize:40, marginBottom:10}}>📏</div>
          Aucune mesure enregistrée.
        </div>
      )}

      {/* GRAPHIQUE VIEW */}
      {view === "graphique" && growth.length > 0 && (
        <div style={{background:cardBg, borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
          <div style={{display:"flex", gap:8, marginBottom:14}}>
            {[["poids",`⚖️ Poids (${weightUnitLabel()})`, "#2e7d32","#a5d6a7"],["taille",`📏 Taille (${heightUnitLabel()})`, "#1565c0","#90caf9"],["crane","🔵 Crâne (cm)","#6a1b9a","#ce93d8"]].map(([key,label,light,dk]) => (
              <button key={key} onClick={()=>setMetric(key)} style={{flex:1, padding:"7px 0", borderRadius:8, border:"2px solid", borderColor: metric===key?(dark?dk:light):"#ddd", background: metric===key?(dark?dk+"22":light+"22"):(dark?"#1e1e30":"#fafafa"), color: metric===key?(dark?dk:light):(dark?"#555":"#aaa"), fontWeight:"bold", fontSize:12, cursor:"pointer"}}>
                {label}
              </button>
            ))}
          </div>
          <GrowthLineChart
            data={sorted}
            valueKey={metric==="poids" ? "_poidsDisplay" : metric==="taille" ? "_tailleDisplay" : "_craneDisplay"}
            color={metric==="poids"?(dark?"#a5d6a7":"#2e7d32"):metric==="taille"?(dark?"#90caf9":"#1565c0"):(dark?"#ce93d8":"#6a1b9a")}
            unit={metric==="poids" ? weightUnitLabel() : "cm"}
            dark={dark}
            whoTable={weightUnit==="g" ? getWhoTable(metric, profile?.sexe) : null}
            birthDate={profile?.dateNaissance || null}
            weightUnit={weightUnit}
          />
          {sorted.filter(d => metric==="poids" ? d._poidsDisplay : d._tailleDisplay).length < 1 && (
            <div style={{textAlign:"center",color:"#aaa",fontSize:12,marginTop:8}}>
              Ajoute au moins 1 mesure pour voir la courbe.
            </div>
          )}
          {!profile?.sexe && (
            <div style={{textAlign:"center",fontSize:11,color:"#ff9800",marginTop:6}}>
              ⚠️ Indique le sexe dans le profil pour afficher les courbes OMS
            </div>
          )}
          {!profile?.dateNaissance && profile?.sexe && (
            <div style={{textAlign:"center",fontSize:11,color:"#ff9800",marginTop:6}}>
              ⚠️ Indique la date de naissance dans le profil pour afficher les courbes OMS
            </div>
          )}
        </div>
      )}

      {/* LISTE VIEW */}
      {view === "liste" && sortedGrowth.map(g => (
        <div key={g.id} style={{...dynCardStyle, display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:14, fontWeight:"bold", color:textPrimary, marginBottom:4}}>{formatDateShort(g.date)}</div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              {g.poids && <span style={{background: dark?"#1a3020":"#e8f5e9", borderRadius:20, padding:"2px 10px", fontSize:13, color: dark?"#a5d6a7":"#2e7d32", fontWeight:"bold"}}>
                ⚖️ {toDisplayWeight(g.poids)} {weightUnitLabel()}
              </span>}
              {g.taille && <span style={{background: dark?"#1a2a40":"#e3f2fd", borderRadius:20, padding:"2px 10px", fontSize:13, color: dark?"#90caf9":"#1565c0", fontWeight:"bold"}}>
                📏 {toDisplayHeight(g.taille)} {heightUnit==="cm"?"cm":""}
              </span>}
              {g.crane && <span style={{background: dark?"#2a1a3a":"#f3e5f5", borderRadius:20, padding:"2px 10px", fontSize:13, color: dark?"#ce93d8":"#6a1b9a", fontWeight:"bold"}}>
                🔵 {parseFloat(g.crane).toFixed(1)} cm
              </span>}
            </div>
            {g.note && <div style={{marginTop:6, fontSize:12, color:"#8a6a5a", fontStyle:"italic"}}>"{g.note}"</div>}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>onEdit(g)} style={{background:"#f0f8ff",border:"none",borderRadius:8,width:30,height:30,fontSize:14,cursor:"pointer"}}>✏️</button>
            <button onClick={()=>setConfirmDelete({message:"Supprimer cette mesure de croissance ?",onConfirm:()=>deleteDoc(doc(db,"growth",String(g.id)))})} style={{background:"#fff0f0",border:"none",borderRadius:8,width:30,height:30,fontSize:14,cursor:"pointer"}}>🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}


// ── SanteTab ─────────────────────────────────────────────────────────────────
const APPT_TYPES = [
  { value:"pediatre",  label:"👨‍⚕️ Pédiatre",          color:"#e8906a" },
  { value:"medecin",   label:"🩺 Médecin de famille", color:"#2e7d32" },
  { value:"vaccin",    label:"💉 Vaccin",              color:"#9c27b0" },
  { value:"urgence",   label:"🚨 Urgence",             color:"#e53935" },
  { value:"autre",     label:"🏥 Autre",               color:"#1565c0" },
];

function daysUntil(dateStr, timeStr) {
  // Parse date parts explicitly to avoid UTC interpretation
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = (timeStr || "23:59").split(":").map(Number);
  const dt = new Date(y, mo-1, d, h, mi, 0); // local timezone
  const now = new Date();
  return (dt - now) / 86400000; // fractional days — negative means past
}

function calendarDaysUntil(dateStr) {
  // Compare calendar dates only (ignoring time) — for "today/tomorrow/X days" labels
  const [y, mo, d] = dateStr.split("-").map(Number);
  const apptDay = new Date(y, mo-1, d, 0, 0, 0);
  const todayDay = new Date();
  todayDay.setHours(0, 0, 0, 0);
  return Math.round((apptDay - todayDay) / 86400000);
}

function apptUrgency(dateStr, timeStr, done) {
  if (done) return "done";
  const elapsed = daysUntil(dateStr, timeStr); // has the appointment time passed?
  const calDays = calendarDaysUntil(dateStr);  // what calendar day is it?
  if (elapsed < 0) return "past";              // appointment time has passed
  if (calDays === 0) return "today";           // same calendar day
  if (calDays <= 3) return "soon";             // within 3 calendar days
  return "future";
}

function generateICS(appt, babyName) {
  const pad = n => String(n).padStart(2,"0");

  // Parse date in local timezone to avoid UTC shift
  const [y, mo, d] = appt.date.split("-").map(Number);
  const [h, mi] = (appt.time || "09:00").split(":").map(Number);
  const dt = new Date(y, mo-1, d, h, mi, 0);
  const end = new Date(dt.getTime() + 60*60*1000);
  const now = new Date();

  const fmt = (date) =>
    `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;

  const type = APPT_TYPES.find(t=>t.value===appt.type)?.label || "Rendez-vous";

  // Sanitize text fields — remove line breaks and special chars
  const sanitize = (s) => (s||"").replace(/[\r\n;,\\]/g, " ").trim();

  const summary = sanitize(`${type} - ${appt.titre || babyName}`);
  const description = sanitize(appt.notes || "");
  const location = sanitize(appt.lieu || "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Journal Bebe//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appt.id}-${Date.now()}@journalbebe`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : null,
    location ? `LOCATION:${location}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  return lines;
}

function SanteTab({ appointments, setAppointments, dark, cardBg, textPrimary, textSecondary, dynCardStyle, babyName, showToast, dynInputStyle, setConfirmDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("upcoming");
  const [form, setForm] = useState({ date:"", time:"09:00", type:"pediatre", titre:"", lieu:"", notes:"" });

  async function handleSubmit() {
    const missingDate = !form.date;
    const missingTitre = !form.titre.trim();
    if (missingDate || missingTitre) {
      showToast(`⚠️ Manquant : ${[missingTitre?"titre":"", missingDate?"date":""].filter(Boolean).join(", ")}`, "#ff9800");
      return;
    }
    const entry = { id: editId||Date.now(), done:false, ...form };
    await setDoc(doc(db, "appointments", String(entry.id)), entry);
    showToast(editId ? "✅ Rendez-vous modifié !" : "📅 Rendez-vous ajouté !");
    setForm({ date:"", time:"09:00", type:"pediatre", titre:"", lieu:"", notes:"" });
    setEditId(null); setShowForm(false);
  }

  function handleEdit(a) {
    setForm({ date:a.date, time:a.time||"09:00", type:a.type, titre:a.titre, lieu:a.lieu||"", notes:a.notes||"" });
    setEditId(a.id); setShowForm(true);
  }

  function handleDelete(id) {
    setConfirmDelete({
      message: "Supprimer ce rendez-vous ?",
      onConfirm: () => { deleteDoc(doc(db, "appointments", String(id))); showToast("🗑️ Supprimé","#e8906a"); }
    });
  }
  function toggleDone(id) {
    const appt = appointments.find(a=>a.id===id);
    if (appt) setDoc(doc(db, "appointments", String(id)), {...appt, done:!appt.done});
  }

  function downloadICS(appt) {
    const ics = generateICS(appt, babyName);
    const uri = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    const a = document.createElement("a");
    a.href = uri;
    a.download = `rdv_${appt.date}_${(appt.titre||"bebe").replace(/\s+/g,"_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("📅 Fichier .ics téléchargé !");
  }

  const sorted = [...appointments].sort((a,b) => {
    // Sort upcoming first (ascending by date+time), then past (descending)
    const dA = daysUntil(a.date, a.time);
    const dB = daysUntil(b.date, b.time);
    if (dA >= 0 && dB >= 0) return dA - dB;  // both upcoming: soonest first
    if (dA < 0 && dB < 0) return dB - dA;    // both past: most recent first
    return dA >= 0 ? -1 : 1;                  // upcoming before past
  });
  const filtered = sorted.filter(a => {
    const d = daysUntil(a.date, a.time);
    if (filter==="upcoming") return !a.done && d >= 0;
    if (filter==="past")     return !a.done && d < 0;
    if (filter==="done")     return a.done;
    return true;
  });

  // Upcoming alerts — within 3 days and not yet passed
  const alerts = appointments.filter(a => {
    const d = daysUntil(a.date, a.time);
    const calDays = calendarDaysUntil(a.date);
    return !a.done && d >= 0 && calDays <= 3;
  });

  const urgencyStyle = {
    done:   { bg: dark?"#1a1a1a":"#f5f5f5",  border:"#bbb",    badge:"✓",   badgeBg:"#9e9e9e" },
    past:   { bg: dark?"#2a1010":"#fff3e0",   border:"#ff7043", badge:"⚠️",  badgeBg:"#ff7043" },
    today:  { bg: dark?"#1a2a10":"#e8f5e9",   border:"#4caf50", badge:"Aujourd'hui", badgeBg:"#4caf50" },
    soon:   { bg: dark?"#1a1a2a":"#fff8e1",   border:"#ffc107", badge:"Bientôt", badgeBg:"#ffc107" },
    future: { bg: dark?"#1a1a2e":"#fafafa",   border:"#e8c5a8", badge:"",    badgeBg:"transparent" },
  };

  return (
    <div style={{padding:"16px", maxWidth:480, margin:"0 auto"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
        <h2 style={{margin:0, fontSize:18, color:textPrimary}}>🏥 Santé & Rendez-vous</h2>
        <button onClick={()=>{setForm({date:"",time:"09:00",type:"pediatre",titre:"",lieu:"",notes:""});setEditId(null);setShowForm(true);}}
          style={{background:"linear-gradient(135deg,#e8906a,#e06b8a)",color:"white",border:"none",borderRadius:50,padding:"9px 16px",fontSize:13,fontWeight:"bold",cursor:"pointer"}}>
          + Ajouter
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{background:dark?"#2a2010":"#fff8e1",border:"2px solid #ffc107",borderRadius:12,padding:"10px 14px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:"bold",color:"#f57f17",marginBottom:6}}>⚠️ Rappels</div>
          {alerts.map(a=>{
            const d=daysUntil(a.date, a.time);
            const calDays=calendarDaysUntil(a.date);
            const type=APPT_TYPES.find(t=>t.value===a.type);
            const timing = calDays===0 ? "Aujourd'hui" : calDays===1 ? "Demain" : `Dans ${calDays} jours`;
            return (
              <div key={a.id} style={{fontSize:12,color:dark?"#ffe082":"#5d4037",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontWeight:"bold",color:calDays===0?"#4caf50":calDays===1?"#ff9800":"#f57f17"}}>{timing}</span>
                <span>· {type?.label} · <strong>{a.titre}</strong>{a.time?` · ${a.time}`:""}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters — À venir first, Tous last */}
      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
        {[["upcoming","À venir"],["past","Passés"],["done","Complétés"],["all","Tous"]].map(([val,label])=>(
          <button key={val} onClick={()=>setFilter(val)} style={{padding:"5px 12px",borderRadius:20,border:"2px solid",borderColor:filter===val?"#e8906a":"#ddd",background:filter===val?(dark?"rgba(232,144,106,0.2)":"#fff0e8"):(dark?"#1e1e30":"#fafafa"),color:filter===val?"#e8906a":(dark?"#888":"#aaa"),fontWeight:"bold",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length===0 && (
        <div style={{textAlign:"center",color:"#c9a07a",marginTop:40}}>
          <div style={{fontSize:40,marginBottom:10}}>🏥</div>
          Aucun rendez-vous {filter!=="all"?"dans cette catégorie":""}.
        </div>
      )}

      {filtered.map(a=>{
        const urgency = apptUrgency(a.date, a.time, a.done);
        const us = urgencyStyle[urgency];
        const type = APPT_TYPES.find(t=>t.value===a.type);
        const d = daysUntil(a.date, a.time);
        const calDays = calendarDaysUntil(a.date);
        const timingLabel = d < 0
          ? `Il y a ${calDays===0?"moins d'1j":Math.abs(calDays)+"j"}`
          : calDays === 0 ? "Aujourd'hui"
          : calDays === 1 ? "Demain"
          : `Dans ${calDays}j`;
        const timingColor = d < 0 ? "#ff7043" : calDays===0 ? "#4caf50" : calDays<=3 ? "#ff9800" : textSecondary;
        return (
          <div key={a.id} style={{background:us.bg, borderRadius:16, padding:"14px 16px", marginBottom:12, border:`2px solid ${us.border}`, opacity:a.done?0.65:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:"bold",color:type?.color||textPrimary}}>{type?.label}</span>
                  {us.badge && <span style={{background:us.badgeBg,color:"white",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:"bold"}}>{us.badge}</span>}
                </div>
                <div style={{fontSize:16,fontWeight:"bold",color:textPrimary,marginBottom:2}}>{a.titre}</div>
                <div style={{fontSize:12,color:textSecondary}}>
                  📅 {new Date(a.date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
                  {a.time && <span> · 🕐 {a.time}</span>}
                  {!a.done && <span style={{marginLeft:6,color:timingColor,fontWeight:"bold"}}>{timingLabel}</span>}
                </div>
                {a.lieu && <div style={{fontSize:12,color:textSecondary,marginTop:2}}>📍 {a.lieu}</div>}
                {a.notes && <div style={{fontSize:12,color:"#8a6a5a",fontStyle:"italic",marginTop:4}}>"{a.notes}"</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginLeft:10}}>
                <button onClick={()=>toggleDone(a.id)} title={a.done?"Marquer non complété":"Marquer complété"} style={{background:a.done?"#e8f5e9":"#f5f5f5",border:`1.5px solid ${a.done?"#4caf50":"#ddd"}`,borderRadius:8,width:32,height:32,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {a.done?"✅":"⬜"}
                </button>
                <button onClick={()=>downloadICS(a)} title="Ajouter au calendrier" style={{background:"#e3f2fd",border:"1.5px solid #1565c0",borderRadius:8,width:32,height:32,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  📅
                </button>
                <button onClick={()=>handleEdit(a)} style={{background:"#f0f8ff",border:"none",borderRadius:8,width:32,height:32,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                <button onClick={()=>handleDelete(a.id)} style={{background:"#fff0f0",border:"none",borderRadius:8,width:32,height:32,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Form Modal */}
      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:cardBg,borderRadius:"24px 24px 0 0",padding:"28px 20px 40px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,0.2)"}}>
            <h2 style={{margin:"0 0 20px",color:textPrimary,fontSize:20,textAlign:"center"}}>{editId?"✏️ Modifier":"📅 Nouveau rendez-vous"}</h2>

            <Label dark={dark}>🏷️ Type</Label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
              {APPT_TYPES.map(t=>(
                <button key={t.value} onClick={()=>setForm(f=>({...f,type:t.value}))} style={{padding:"7px 14px",borderRadius:20,border:"2px solid",borderColor:form.type===t.value?t.color:"#ddd",background:form.type===t.value?(dark?t.color+"33":t.color+"22"):(dark?"#1e1e30":"#fafafa"),color:form.type===t.value?t.color:(dark?"#888":"#aaa"),fontWeight:"bold",fontSize:13,cursor:"pointer"}}>
                  {t.label}
                </button>
              ))}
            </div>

            <Label dark={dark}>📝 Titre / Description</Label>
            <input value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))} placeholder="ex: Visite 2 mois, Vaccins DTP..." style={dynInputStyle}/>

            <Label dark={dark}>📅 Date</Label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={dynInputStyle}/>

            <Label dark={dark}>🕐 Heure</Label>
            <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={dynInputStyle}/>

            <Label dark={dark}>📍 Lieu (optionnel)</Label>
            <input value={form.lieu} onChange={e=>setForm(f=>({...f,lieu:e.target.value}))} placeholder="ex: Clinique, CLSC..." style={dynInputStyle}/>

            <Label dark={dark}>📝 Notes (optionnel)</Label>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Questions à poser, informations..." rows={3} style={{...dynInputStyle,resize:"vertical",minHeight:70}}/>

            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>{setShowForm(false);setEditId(null);}} style={btnSecondaryBase}>Annuler</button>
              <button onClick={handleSubmit} style={btnPrimaryBase}>{editId?"Enregistrer":"Ajouter"}</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}


// ── ProfileTab ───────────────────────────────────────────────────────────────
function ProfileTab({ profile, saveProfile, dark, cardBg, textPrimary, textSecondary, dynInputStyle, todayStr }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  // Keep draft in sync if profile loads from Firebase after mount
  useEffect(() => { setDraft(profile); }, [profile]);

  function handleSave() {
    saveProfile(draft);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(profile);
    setEditing(false);
  }

  const has = (v) => v && String(v).trim() !== "";
  const sexeLabel = {fille:"👧 Fille", garcon:"👦 Garçon", autre:"🌸 Autre"}[profile.sexe] || null;
  const alimentLabel = {maternelle:"🤱 Maternelle", commerciale:"🥛 Commerciale", mixte:"🔀 Mixte"}[profile.typeAlimentation] || null;

  // Age calculation
  const ageBlock = profile.dateNaissance ? (() => {
    const timeStr = profile.heureNaissance || "00:00";
    const [y,mo,d] = profile.dateNaissance.split("-").map(Number);
    const [h,mi] = timeStr.split(":").map(Number);
    const birth = new Date(y, mo-1, d, h, mi);
    const now = new Date();
    const diffMs = now - birth;
    if (diffMs < 0) return null;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffMs / 86400000);
    const semaines = Math.floor(diffDays / 7);
    const jourReste = diffDays % 7;
    const mois = Math.floor(diffDays / 30.44);
    const moisReste = Math.floor((diffDays - mois * 30.44) / 7);
    let ageStr = "";
    if (diffHours < 24) ageStr = `${diffHours}h ${diffMins%60}min`;
    else if (diffDays < 14) ageStr = `${diffDays} jour${diffDays>1?"s":""} ${diffHours%24}h`;
    else if (diffDays < 90) ageStr = `${semaines} sem${jourReste>0?` ${jourReste}j`:""}`;
    else ageStr = `${mois} mois${moisReste>0?` ${moisReste} sem`:""}`;
    return { ageStr, diffDays };
  })() : null;

  const rowStyle = {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    paddingBottom:10, marginBottom:10,
    borderBottom:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`,
  };
  const labelStyle = { fontSize:12, color:textSecondary, fontWeight:"bold" };
  const valueStyle = { fontSize:14, color:textPrimary, fontWeight:"bold", textAlign:"right" };
  const emptyStyle = { fontSize:13, color:dark?"#444":"#ccc", fontStyle:"italic", textAlign:"right" };

  return (
    <div style={{padding:"16px", maxWidth:480, margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
        <h2 style={{margin:0, fontSize:18, color:textPrimary}}>👶 Profil de bébé</h2>
        {!editing && (
          <button onClick={()=>{setDraft(profile);setEditing(true);}}
            style={{padding:"8px 18px", borderRadius:20, border:`1.5px solid ${dark?"#5a3a6e":"#e8c5a8"}`, background:"transparent", color:textPrimary, fontWeight:"bold", fontSize:13, cursor:"pointer"}}>
            ✏️ Modifier
          </button>
        )}
      </div>

      {/* ── READ-ONLY VIEW ── */}
      {!editing && (
        <>
          {/* Age banner */}
          {ageBlock && (
            <div style={{background:dark?"#1a2a3a":"#e3f2fd", borderRadius:12, padding:"12px 16px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:20, fontWeight:"bold", color:dark?"#90caf9":"#1565c0"}}>🎉 {ageBlock.ageStr}</div>
                <div style={{fontSize:11, color:dark?"#5a8aaa":"#5a8aaa"}}>{ageBlock.diffDays} jours · né à {profile.heureNaissance || "—"}</div>
              </div>
              {profile.sexe && <div style={{fontSize:30}}>{profile.sexe==="fille"?"👧":profile.sexe==="garcon"?"👦":"🌸"}</div>}
            </div>
          )}

          <div style={{background:cardBg, borderRadius:16, padding:"16px 18px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:14}}>
            <div style={rowStyle}>
              <span style={labelStyle}>👶 Prénom</span>
              <span style={has(profile.nom)?valueStyle:emptyStyle}>{profile.nom || "Non renseigné"}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>🎂 Date de naissance</span>
              <span style={has(profile.dateNaissance)?valueStyle:emptyStyle}>{profile.dateNaissance || "Non renseignée"}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>⚥ Sexe</span>
              <span style={has(sexeLabel)?valueStyle:emptyStyle}>{sexeLabel || "Non renseigné"}</span>
            </div>
            <div style={{...rowStyle, borderBottom:"none", marginBottom:0, paddingBottom:0}}>
              <span style={labelStyle}>🍼 Alimentation</span>
              <span style={has(alimentLabel)?valueStyle:emptyStyle}>{alimentLabel || "Non renseignée"}</span>
            </div>
          </div>

          <div style={{background:cardBg, borderRadius:16, padding:"16px 18px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:14}}>
            <div style={{fontSize:12, fontWeight:"bold", color:textSecondary, marginBottom:10}}>📏 Mesures à la naissance</div>
            {[
              ["⚖️ Poids", profile.poidsNaissance, "g"],
              ["📏 Taille", profile.tailleNaissance, "cm"],
              ["🔵 Crâne", profile.perimCranien, "cm"],
            ].map(([label, val, unit], i, arr) => (
              <div key={label} style={{...rowStyle, borderBottom: i<arr.length-1?rowStyle.borderBottom:"none", marginBottom:i<arr.length-1?rowStyle.marginBottom:0, paddingBottom:i<arr.length-1?rowStyle.paddingBottom:0}}>
                <span style={labelStyle}>{label}</span>
                <span style={has(val)?valueStyle:emptyStyle}>{val ? `${val} ${unit}` : "Non renseigné"}</span>
              </div>
            ))}
          </div>

          <div style={{textAlign:"center", fontSize:12, color:dark?"#444":"#ccc"}}>
            Appuie sur ✏️ Modifier pour changer les informations
          </div>
        </>
      )}

      {/* ── EDIT MODE ── */}
      {editing && (
        <>
          <div style={{background:cardBg, borderRadius:16, padding:"16px", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
            <Label dark={dark}>👶 Prénom</Label>
            <input value={draft.nom||""} onChange={e=>setDraft(d=>({...d,nom:e.target.value}))} placeholder="Prénom de bébé" style={dynInputStyle}/>

            <Label dark={dark}>🎂 Date de naissance</Label>
            <input type="date" value={draft.dateNaissance||""} max={todayStr()} onChange={e=>setDraft(d=>({...d,dateNaissance:e.target.value}))} style={dynInputStyle}/>

            <Label dark={dark}>🕐 Heure de naissance</Label>
            <input type="time" value={draft.heureNaissance||""} onChange={e=>setDraft(d=>({...d,heureNaissance:e.target.value}))} style={dynInputStyle}/>

            <Label dark={dark}>⚥ Sexe</Label>
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              {[["fille","👧 Fille"],["garcon","👦 Garçon"],["autre","🌸 Autre"]].map(([val,label])=>(
                <button key={val} onClick={()=>setDraft(d=>({...d,sexe:val}))} style={{flex:1,padding:"10px 0",borderRadius:10,border:"2px solid",borderColor:draft.sexe===val?"#e06b8a":"#ddd",background:draft.sexe===val?(dark?"rgba(224,107,138,0.2)":"#fce4ec"):(dark?"#1e1e30":"#fafafa"),color:draft.sexe===val?"#c2185b":(dark?"#555":"#aaa"),fontWeight:"bold",fontSize:13,cursor:"pointer"}}>
                  {label}
                </button>
              ))}
            </div>

            <Label dark={dark}>🍼 Type d'alimentation</Label>
            <div style={{display:"flex",gap:10,marginBottom:4}}>
              {[["maternelle","🤱 Maternelle"],["commerciale","🥛 Commerciale"],["mixte","🔀 Mixte"]].map(([val,label])=>(
                <button key={val} onClick={()=>setDraft(d=>({...d,typeAlimentation:val}))} style={{flex:1,padding:"9px 0",borderRadius:10,border:"2px solid",borderColor:draft.typeAlimentation===val?"#e8906a":"#ddd",background:draft.typeAlimentation===val?(dark?"rgba(232,144,106,0.2)":"#fff0e8"):(dark?"#1e1e30":"#fafafa"),color:draft.typeAlimentation===val?"#b05a30":(dark?"#555":"#aaa"),fontWeight:"bold",fontSize:12,cursor:"pointer"}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{background:cardBg, borderRadius:16, padding:"16px", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:13,fontWeight:"bold",color:textPrimary,marginBottom:12}}>📏 Mesures à la naissance</div>
            <Label dark={dark}>⚖️ Poids de naissance (grammes)</Label>
            <input type="number" min="0" placeholder="ex: 3400" value={draft.poidsNaissance||""} onChange={e=>setDraft(d=>({...d,poidsNaissance:e.target.value}))} style={dynInputStyle}/>
            <Label dark={dark}>📏 Taille à la naissance (cm)</Label>
            <input type="number" min="0" step="0.1" placeholder="ex: 50.0" value={draft.tailleNaissance||""} onChange={e=>setDraft(d=>({...d,tailleNaissance:e.target.value}))} style={dynInputStyle}/>
            <Label dark={dark}>🔵 Périmètre crânien à la naissance (cm)</Label>
            <input type="number" min="0" step="0.1" placeholder="ex: 34.5" value={draft.perimCranien||""} onChange={e=>setDraft(d=>({...d,perimCranien:e.target.value}))} style={dynInputStyle}/>
          </div>

          <div style={{display:"flex",gap:10,marginTop:4}}>
            <button onClick={handleCancel} style={{...btnSecondaryBase,flex:1}}>Annuler</button>
            <button onClick={handleSave} style={{...btnPrimaryBase,flex:2}}>✅ Enregistrer</button>
          </div>
        </>
      )}
    </div>
  );
}
