import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "./firebase.js";
import { doc, collection, onSnapshot, setDoc, deleteDoc, getDoc } from "firebase/firestore";

// Base styles — var (not const) to avoid temporal dead zone after Vite bundling
var inputStyleBase={width:"100%",padding:"10px 14px",borderRadius:10,fontSize:15,marginBottom:14,boxSizing:"border-box",outline:"none",fontFamily:"Georgia,serif"};
var btnPrimaryBase={flex:2,padding:"13px 0",borderRadius:12,border:"none",background:"linear-gradient(135deg,#e8906a,#e06b8a)",color:"white",fontSize:16,fontWeight:"bold",cursor:"pointer"};
var btnSecondaryBase={flex:1,padding:"13px 0",borderRadius:12,border:"2px solid #e8c5a8",background:"white",color:"#b05a30",fontSize:15,cursor:"pointer"};

var APP_VERSION = "1.5.4";

// ── WHO Growth Reference Data ─────────────────────────────────────────────────
// Source: WHO Child Growth Standards (0-24 months)
// Age in months, values in kg for weight, cm for height/head circumference
// Percentiles: P3, P15, P50, P85, P97

var WHO_WEIGHT_GIRLS = [
  // [month, P3, P15, P50, P85, P97]
  [0,2.4,2.8,3.2,3.7,4.2],[1,3.2,3.6,4.2,4.8,5.5],[2,3.9,4.5,5.1,5.8,6.6],
  [3,4.5,5.2,5.8,6.6,7.5],[4,5.0,5.7,6.4,7.3,8.2],[5,5.4,6.1,6.9,7.8,8.8],
  [6,5.7,6.5,7.3,8.2,9.3],[7,6.0,6.8,7.6,8.6,9.8],[8,6.3,7.0,7.9,9.0,10.2],
  [9,6.5,7.3,8.2,9.3,10.5],[10,6.7,7.5,8.5,9.6,10.9],[11,6.9,7.7,8.7,9.9,11.2],
  [12,7.0,7.9,8.9,10.1,11.5],[15,7.6,8.5,9.6,10.9,12.4],[18,8.1,9.1,10.2,11.6,13.2],
  [21,8.6,9.6,10.9,12.3,14.0],[24,9.0,10.2,11.5,13.0,14.8],
];
var WHO_WEIGHT_BOYS = [
  [0,2.5,2.9,3.3,3.9,4.4],[1,3.4,3.9,4.5,5.1,5.8],[2,4.3,4.9,5.6,6.3,7.1],
  [3,5.0,5.7,6.4,7.2,8.0],[4,5.6,6.2,7.0,7.8,8.7],[5,6.0,6.7,7.5,8.4,9.3],
  [6,6.4,7.1,7.9,8.8,9.8],[7,6.7,7.4,8.3,9.2,10.3],[8,6.9,7.7,8.6,9.6,10.7],
  [9,7.1,7.9,8.9,9.9,11.0],[10,7.4,8.2,9.2,10.2,11.4],[11,7.6,8.4,9.4,10.5,11.7],
  [12,7.7,8.6,9.6,10.8,12.0],[15,8.4,9.4,10.5,11.7,13.1],[18,9.0,10.0,11.3,12.6,14.1],
  [21,9.6,10.7,12.0,13.4,15.0],[24,10.2,11.3,12.7,14.2,15.9],
];
var WHO_HEIGHT_GIRLS = [
  [0,44.8,46.8,49.1,51.5,53.5],[1,50.2,52.4,53.7,55.6,57.6],[2,53.0,55.2,57.1,59.1,61.1],
  [3,55.6,57.7,59.8,61.9,63.9],[4,57.8,59.9,62.1,64.3,66.4],[5,59.6,61.8,64.0,66.3,68.5],
  [6,61.2,63.5,65.7,68.0,70.3],[7,62.7,65.0,67.3,69.7,72.1],[8,64.0,66.4,68.7,71.2,73.7],
  [9,65.3,67.7,70.1,72.6,75.2],[10,66.5,68.9,71.5,74.0,76.7],[11,67.7,70.1,72.8,75.4,78.1],
  [12,68.9,71.3,74.0,76.7,79.5],[15,72.0,74.8,77.5,80.3,83.1],[18,75.0,77.8,80.7,83.7,86.7],
  [21,77.5,80.5,83.7,86.8,90.0],[24,80.0,83.2,86.4,89.7,93.0],
];
var WHO_HEIGHT_BOYS = [
  [0,46.1,48.2,49.9,51.8,53.8],[1,51.1,53.3,54.7,56.5,58.6],[2,54.4,56.4,58.4,60.4,62.4],
  [3,57.3,59.4,61.4,63.5,65.5],[4,59.7,61.8,63.9,66.0,68.0],[5,61.7,63.8,65.9,68.0,70.1],
  [6,63.3,65.5,67.6,69.8,71.9],[7,64.8,67.0,69.2,71.5,73.7],[8,66.2,68.4,70.6,73.0,75.3],
  [9,67.5,69.7,72.0,74.4,76.8],[10,68.7,71.0,73.3,75.8,78.2],[11,69.9,72.2,74.5,77.1,79.6],
  [12,71.0,73.4,75.7,78.4,81.0],[15,74.0,76.6,79.1,81.8,84.5],[18,76.9,79.6,82.3,85.2,88.0],
  [21,79.7,82.5,85.6,88.6,91.6],[24,82.3,85.5,87.8,91.2,94.5],
];
var WHO_HEAD_GIRLS = [
  [0,31.7,32.9,33.9,35.1,36.2],[1,33.9,35.1,36.1,37.2,38.3],[2,35.4,36.6,37.6,38.7,39.8],
  [3,36.6,37.8,38.8,39.9,41.0],[4,37.6,38.8,39.8,40.9,42.0],[5,38.4,39.6,40.6,41.7,42.8],
  [6,39.1,40.3,41.3,42.4,43.5],[9,40.7,41.9,42.9,44.0,45.1],[12,41.9,43.1,44.2,45.3,46.4],
  [18,43.4,44.6,45.7,46.8,47.9],[24,44.5,45.7,46.9,48.0,49.1],
];
var WHO_HEAD_BOYS = [
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

var STORAGE_KEY = "baby_feedings_v1";
var GROWTH_KEY = "baby_growth_v1";
var SETTINGS_KEY = "baby_settings_v1";
var PROFILE_KEY = "baby_profile_v1";
var APPTS_KEY = "baby_appointments_v1";
var HOURS_OPTIONS = [0,1,2,3,4,5,6,7,8,9,10,11,12];
var MINUTES_OPTIONS = [0,5,10,15,20,25,30,35,40,45,50,55];

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

var initialForm = {
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
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem("journalViewMode") || "auto"; } catch { return "auto"; }
  });
  const [showStats, setShowStats] = useState(false);
  const [statsDateFilter, setStatsDateFilter] = useState({ start: "", end: "" });
  const [collapsedDays, setCollapsedDays] = useState(() => {
    try { return JSON.parse(localStorage.getItem("collapsedDays") || "{}"); } catch { return {}; }
  });

  function setViewModeAndSave(mode) {
    setViewMode(mode);
    try { localStorage.setItem("journalViewMode", mode); } catch {}
    // Reset individual overrides when switching mode
    if (mode !== "libre") {
      setCollapsedDays({});
      try { localStorage.setItem("collapsedDays", "{}"); } catch {}
    }
  }

  // Reset date filter when month changes
  useEffect(() => { setStatsDateFilter({ start: "", end: "" }); }, [selectedMonth]);

  function toggleDayCollapse(date, sortedDates) {
    // If in auto mode and user manually toggles — switch to libre
    if (viewMode === "auto") {
      setViewModeAndSave("libre");
      // In libre, all start open except this one which we close
      const next = {};
      sortedDates.forEach((d, i) => { if (i >= 2) next[d] = true; }); // re-open top 2
      next[date] = !next[date]; // toggle clicked one
      setCollapsedDays(next);
      try { localStorage.setItem("collapsedDays", JSON.stringify(next)); } catch {}
      return;
    }
    setCollapsedDays(prev => {
      const next = { ...prev, [date]: !prev[date] };
      try { localStorage.setItem("collapsedDays", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Determine if a day is collapsed based on viewMode
  function isDayCollapsed(date, index) {
    if (viewMode === "resume") return true;
    if (viewMode === "auto") return index >= 2; // only top 2 open
    // libre: use individual state
    return !!collapsedDays[date];
  }
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  });
  const [showCoucheForm, setShowCoucheForm] = useState(false);
  const [editCoucheId, setEditCoucheId] = useState(null);
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

  // Month navigation helpers
  function prevMonth() {
    const [y,m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m-2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }
  function nextMonth() {
    const [y,m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }
  function monthLabel(ym) {
    const [y,m] = ym.split("-").map(Number);
    return new Date(y,m-1,1).toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  }
  const allMonths = [...new Set(feedings.map(f=>f.date.slice(0,7)))].sort((a,b)=>b.localeCompare(a));
  const isCurrentMonth = selectedMonth === (() => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; })();
  const hasNextMonth = allMonths.some(m => m > selectedMonth) || !isCurrentMonth;

  const grouped = feedings.reduce((acc,f) => { if(!acc[f.date]) acc[f.date]=[]; acc[f.date].push(f); return acc; }, {});
  // Filter by selected month
  const filteredDates = Object.keys(grouped).filter(d=>d.startsWith(selectedMonth)).sort((a,b)=>b.localeCompare(a));
  const sortedDates = filteredDates;

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
    const id = editCoucheId || String(Date.now());
    await setDoc(doc(db, "feedings", id), { _type: "couche", ...coucheForm });
    showToast(editCoucheId ? "🧷 Couche modifiée !" : "🧷 Couche ajoutée !");
    setCoucheForm({ date: todayStr(), time: getNow(), pipi: false, caca: false, note: "" });
    setEditCoucheId(null);
    setShowCoucheForm(false);
    onFormClose?.();
  }

  function handleEditCouche(f) {
    setCoucheForm({ date: f.date, time: f.time, pipi: !!f.pipi, caca: !!f.caca, note: f.note || "" });
    setEditCoucheId(f.id);
    setShowCoucheForm(true);
    onFormOpen?.();
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



  // Stats computed values (moved out of IIFE to avoid TDZ)
  // All-time entries
  const allBoires = feedings.filter(f=>f._type!=="couche");
  const allDays = [...new Set(feedings.map(f=>f.date))].length;

  // Month entries — with optional date range filter
  const [selY, selM] = selectedMonth.split("-").map(Number);
  const monthStart = statsDateFilter.start || `${selectedMonth}-01`;
  const daysInMonth = new Date(selY, selM, 0).getDate();
  const monthEnd = statsDateFilter.end || `${selectedMonth}-${String(daysInMonth).padStart(2,"0")}`;
  const monthEntries = feedings.filter(f =>
    f.date >= monthStart && f.date <= monthEnd
  );
  const monthBoires = monthEntries.filter(f=>f._type!=="couche");
  const monthDays = [...new Set(monthEntries.map(f=>f.date))].length;

  const hasFilter = statsDateFilter.start || statsDateFilter.end;

  const calc = (boires, allE, days) => {
    const total = boires.length;
    const avg = days>0 ? (total/days).toFixed(1) : 0;
    const pipi = allE.filter(f=>f.pipi).length;
    const caca = allE.filter(f=>f.caca).length;
    const avgPipi = days>0 ? (pipi/days).toFixed(1) : 0;
    const avgCaca = days>0 ? (caca/days).toFixed(1) : 0;
    const cMat = boires.reduce((s,f)=>s+(parseFloat(f.complMaternel)||0)+((f.complementType==="maternel")?(parseFloat(f.complement)||0):0), 0);
    const cComm = boires.reduce((s,f)=>s+(parseFloat(f.complCommercial)||0)+((f.complementType==="commercial")?(parseFloat(f.complement)||0):0), 0);
    const cTotal = cMat + cComm;
    const avgMat = days>0 ? (cMat/days).toFixed(0) : 0;
    const avgComm = days>0 ? (cComm/days).toFixed(0) : 0;
    const avgTotal = days>0 ? (cTotal/days).toFixed(0) : 0;
    return { total, avg, pipi, caca, avgPipi, avgCaca, cMat, cComm, cTotal, avgMat, avgComm, avgTotal };
  }

  const ms = calc(monthBoires, monthEntries, monthDays);
  const as = calc(allBoires, feedings, allDays);


  const dataPoints = sorted.map((d,i) => {
    const val = parseFloat(d[valueKey]);
    const prevVal = i>0 ? parseFloat(sorted[i-1][valueKey]) : null;
    const xVal = useAgeX ? whoPoints.ages[i] : i;
    return { d, i, val, prevVal, cx:pxVal(xVal), xVal };
  });

  const linePoints = dataPoints.map(p=>`${p.cx},${py(p.val)}`).join(" ");
  const areaPoints = `${dataPoints[0]?.cx},${padT+gH} ${linePoints} ${dataPoints[dataPoints.length-1]?.cx},${padT+gH}`;

  // Smart X labels — avoid overlap based on zoom level
  const visiblePoints = dataPoints.filter(p => p.cx >= padL-5 && p.cx <= W-padR+5);
  const minLabelSpacing = 32; // px minimum between labels
  const xLabels = (() => {
    const result = [];
    let lastX = -999;
    visiblePoints.forEach(p => {
      if (p.cx - lastX >= minLabelSpacing) {
        // Format label based on zoom: show month if zoomed in enough
        let label;
        if (useAgeX && zoomLevel >= 3) {
          // Show "Xj" (days) when very zoomed
          const ageMonths = p.xVal;
          label = `${Math.round(ageMonths*30)}j`;
        } else {
          label = p.d._label || formatDateShort(p.d.date);
        }
        result.push({ ...p, label });
        lastX = p.cx;
      }
    });
    return result;
  })();

  function handleDotClick(e, d, i, val, prevVal) {
    e.stopPropagation();
    if (tooltip?.i===i) { setTooltip(null); return; }
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const scaleX = svgRect.width/W, scaleY = svgRect.height/H;
    const cx = dataPoints[i].cx;
    const screenX = svgRect.left + cx*scaleX;
    const screenY = svgRect.top + py(val)*scaleY + window.scrollY;
    let pct = null;
    if (whoPoints && whoTable) {
      // WHO data is always in kg (weight) or cm (height)
      // val is already converted to display unit, convert back to base for comparison
      const ref = whoInterpolate(whoTable, dataPoints[i].xVal);
      if (ref) {
        // Convert WHO kg values to match current display unit
        let factor;
        if (unit==="g") factor = 1000;       // WHO kg → g
        else if (unit==="lb") factor = 2.205; // WHO kg → lb
        else factor = 1;                      // WHO cm → cm (or po already handled below)
        // For height in po (inches): WHO cm → inches
        const isInches = unit==="po";
        const rv = ref.map(v => isInches ? v/2.54*10 : v*factor);
        if (val<=rv[0]) pct="< P3";
        else if (val<=rv[1]) pct="P3–P15";
        else if (val<=rv[2]) pct="P15–P50";
        else if (val<=rv[3]) pct="P50–P85";
        else if (val<=rv[4]) pct="P85–P97";
        else pct="> P97";
      }
    }
    setTooltip({ i, d, val, prevVal, screenX, screenY, pct });
  }

  return (
    <div style={{position:"relative"}}>
      {/* WHO legend */}
      {whoPoints && (
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:6,flexWrap:"wrap"}}>
          {[["P3/P97","#e53935"],["P15/P85","#ff9800"],["P50","#4caf50"]].map(([l,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:textCol}}>
              <svg width={18} height={8}><line x1={0} y1={4} x2={18} y2={4} stroke={c} strokeWidth={1.5} strokeDasharray={l==="P50"?"none":"4,2"}/></svg>{l}
            </div>
          ))}
        </div>
      )}

      {/* Zoom bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,padding:"0 4px"}}>
        <span style={{fontSize:10,color:dark?"#555":"#bbb"}}>
          {isZoomed ? `🔍 ${zoomLevel}x · ← un doigt pour déplacer` : "🔍 Pinch / molette pour zoomer"}
        </span>
        {isZoomed && (
          <button onClick={resetZoom} style={{fontSize:10,padding:"2px 8px",borderRadius:10,border:`1px solid ${dark?"#444":"#ddd"}`,background:dark?"#2a2a3e":"#f5f5f5",color:dark?"#aaa":"#888",cursor:"pointer"}}>
            ↺ Reset
          </button>
        )}
      </div>

      {/* Chart */}
      <div ref={containerRef}
        style={{position:"relative",touchAction:"none",userSelect:"none",cursor:isZoomed?"grab":"default"}}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}>
        <svg ref={svgRef} width={W} height={H} style={{display:"block",margin:"0 auto",overflow:"hidden"}}
          onClick={()=>setTooltip(null)}>
          <defs>
            <clipPath id="chartClip">
              <rect x={padL} y={0} width={gW} height={H}/>
            </clipPath>
          </defs>

          {/* Y grid */}
          {yLabels.map((v,i)=>(
            <g key={i}>
              <line x1={padL} y1={py(v)} x2={W-padR} y2={py(v)} stroke={gridCol} strokeWidth={1}/>
              <text x={padL-4} y={py(v)+4} textAnchor="end" fontSize={9} fill={textCol}>{v}</text>
            </g>
          ))}
          <text x={padL-2} y={padT-4} fontSize={9} fill={textCol}>{unit}</text>

          {/* Clipped data */}
          <g clipPath="url(#chartClip)">
            {whoPoints && WHO_COLORS.map(({pIdx,color:wc,dash,opacity})=>(
              <path key={pIdx} d={whoLinePath(pIdx)} fill="none" stroke={wc}
                strokeWidth={pIdx===2?1.5:1} strokeDasharray={dash} opacity={opacity}/>
            ))}
            {sorted.length>1 && <>
              <polygon points={areaPoints} fill={color} fillOpacity={0.15}/>
              <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
            </>}
            {dataPoints.map(({d,i,val,prevVal,cx})=>{
              const sel = tooltip?.i===i;
              return (
                <g key={i} onClick={e=>handleDotClick(e,d,i,val,prevVal)} style={{cursor:"pointer"}}>
                  <circle cx={cx} cy={py(val)} r={14} fill="transparent"/>
                  <circle cx={cx} cy={py(val)} r={sel?6:4}
                    fill={sel?"white":color} stroke={sel?color:(dark?"#1a1a2e":"white")} strokeWidth={sel?3:2}/>
                </g>
              );
            })}
          </g>

          {/* Smart X labels */}
          {xLabels.map(({i,cx,label})=>(
            <text key={i} x={cx} y={H-4} textAnchor="middle" fontSize={9}
              fill={tooltip?.i===i?color:textCol}>{label}</text>
          ))}
        </svg>
      </div>

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
            <div style={{fontSize:15,fontWeight:"bold",marginBottom:4}}>
              {unit==="g" ? Math.round(val) : unit==="lb" ? parseFloat(val).toFixed(2) : parseFloat(val).toFixed(1)} {unit}
            </div>
            {pct && <div style={{background:dark?"#1a1a2e":"#f5f5f5",borderRadius:8,padding:"3px 8px",fontSize:11,fontWeight:"bold",color:"#333",marginBottom:4}}>📊 Percentile OMS : {pct}</div>}
            {diff!==null && <div style={{color:diff>=0?"#4caf50":"#e53935",marginBottom:2}}>
              {diff>=0?"▲":"▼"} {unit==="g"?Math.round(Math.abs(diff)):unit==="lb"?Math.abs(diff).toFixed(2):Math.abs(diff).toFixed(1)} {unit} vs précédent
            </div>}
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
  const [heightUnit, setHeightUnit] = useState("cm");
  const [showWho, setShowWho] = useState(false); // WHO percentiles off by default

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
    // Numeric values for chart (always numbers, no units)
    _poidsDisplay: g.poids ? String(weightUnit==="lb" ? (parseFloat(g.poids)/453.592).toFixed(2) : parseFloat(g.poids)) : "",
    _tailleDisplay: g.taille ? String(heightUnit==="ft" ? (parseFloat(g.taille)/2.54).toFixed(1) : parseFloat(g.taille)) : "",
    _craneDisplay: g.crane ? String(parseFloat(g.crane).toFixed(1)) : "",
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

  const poidsChangeG   = latestPoids&&prevPoids   ? (parseFloat(toDisplayWeight(latestPoids.poids))  - parseFloat(toDisplayWeight(prevPoids.poids))).toFixed(weightUnit==="lb"?2:0)  : null;
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
              <button key={unit} onClick={()=>{ setWeightUnit(unit); }} style={{padding:"4px 14px",border:"none",background:weightUnit===unit?"#e8906a":(dark?"#1e1e30":"#fafafa"),color:weightUnit===unit?"white":(dark?"#888":"#aaa"),fontWeight:"bold",fontSize:12,cursor:"pointer"}}>
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

          {/* WHO percentile toggle */}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
            <button onClick={()=>setShowWho(v=>!v)} style={{padding:"5px 12px",borderRadius:20,border:"2px solid",borderColor:showWho?"#4caf50":"#ddd",background:showWho?(dark?"rgba(76,175,80,0.15)":"#e8f5e9"):(dark?"#1e1e30":"#fafafa"),color:showWho?"#4caf50":(dark?"#555":"#aaa"),fontWeight:"bold",fontSize:11,cursor:"pointer"}}>
              📊 Courbes OMS {showWho?"✓":""}
            </button>
          </div>

          <GrowthLineChart
            key={`${metric}-${weightUnit}-${heightUnit}`}
            data={sorted}
            valueKey={metric==="poids" ? "_poidsDisplay" : metric==="taille" ? "_tailleDisplay" : "_craneDisplay"}
            color={metric==="poids"?(dark?"#a5d6a7":"#2e7d32"):metric==="taille"?(dark?"#90caf9":"#1565c0"):(dark?"#ce93d8":"#6a1b9a")}
            unit={metric==="poids" ? weightUnitLabel() : metric==="taille" ? (heightUnit==="ft" ? "po" : "cm") : "cm"}
            dark={dark}
            showWho={showWho}
            whoTable={weightUnit==="g" ? getWhoTable(metric, profile?.sexe) : null}
            birthDate={profile?.dateNaissance || null}
          />
          {showWho && !profile?.sexe && (
            <div style={{textAlign:"center",fontSize:11,color:"#ff9800",marginTop:6}}>
              ⚠️ Indique le sexe dans le profil pour les courbes OMS
            </div>
          )}
          {showWho && !profile?.dateNaissance && profile?.sexe && (
            <div style={{textAlign:"center",fontSize:11,color:"#ff9800",marginTop:6}}>
              ⚠️ Indique la date de naissance dans le profil pour les courbes OMS
            </div>
          )}

          {/* WHO explanation box */}
          {showWho && (
            <div style={{marginTop:12,background:dark?"#1a2a1a":"#f1f8f1",borderRadius:12,padding:"12px 14px",border:`1px solid ${dark?"#2a4a2a":"#c8e6c9"}`}}>
              <div style={{fontSize:12,fontWeight:"bold",color:dark?"#a5d6a7":"#2e7d32",marginBottom:8}}>
                📊 Comment lire les courbes de l'OMS
              </div>
              <div style={{fontSize:11,color:dark?"#888":"#555",lineHeight:1.6,marginBottom:8}}>
                Les courbes de l'Organisation Mondiale de la Santé (OMS) montrent la distribution du poids, de la taille et du périmètre crânien de bébés en bonne santé à travers le monde.
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {color:"#4caf50", dash:false, label:"P50 — Médiane", desc:"50% des bébés sont en dessous de cette valeur. C'est la référence centrale."},
                  {color:"#ff9800", dash:true,  label:"P15 et P85",   desc:"Zone normale. 70% des bébés se trouvent entre ces deux courbes."},
                  {color:"#e53935", dash:true,  label:"P3 et P97",    desc:"Limites extrêmes. Moins de 6% des bébés sont en dehors. Une consultation médicale est recommandée."},
                ].map(item=>(
                  <div key={item.label} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <svg width={24} height={12} style={{flexShrink:0,marginTop:2}}>
                      <line x1={0} y1={6} x2={24} y2={6} stroke={item.color} strokeWidth={item.label.includes("P50")?2:1.5} strokeDasharray={item.dash?"4,2":"none"}/>
                    </svg>
                    <div>
                      <span style={{fontSize:11,fontWeight:"bold",color:item.color}}>{item.label} </span>
                      <span style={{fontSize:11,color:dark?"#777":"#666"}}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:8,fontSize:10,color:dark?"#555":"#999",fontStyle:"italic"}}>
                💡 Le percentile de bébé s'affiche en cliquant sur un point du graphique. Un percentile stable dans le temps est plus important que sa valeur absolue.
              </div>
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
var APPT_TYPES = [
  { value:"pediatre",  label:"👨‍⚕️ Pédiatre",          color:"#e8906a" },
  { value:"medecin",   label:"🩺 Médecin de famille", color:"#2e7d32" },
  { value:"vaccin",    label:"💉 Vaccin",              color:"#9c27b0" },
  { value:"clsc",      label:"🏥 CLSC",                color:"#0288d1" },
  { value:"therapie",  label:"🤲 Thérapies douces",   color:"#00796b" },
  { value:"urgence",   label:"🚨 Urgence",             color:"#e53935" },
  { value:"autre",     label:"🏥 Autre",               color:"#1565c0" },
];

function daysUntil(dateStr, timeStr) {
  // Parse date parts explicitly to avoid UTC interpretation
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = (timeStr || "23:59").split(":").map(Number);
  const dt = new Date(y, mo-1, d, h, mi, 0); // local timezone
  const now = new Date();
  // Add 60 min grace period — appointment stays in "À venir" for 1h after scheduled time
  return (dt.getTime() + 60*60*1000 - now.getTime()) / 86400000;
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
  const elapsed = daysUntil(dateStr, timeStr); // uses grace period
  const calDays = calendarDaysUntil(dateStr);
  if (elapsed < 0) return "past";              // past grace period
  // Check if we're in grace period (past scheduled time but within 1h)
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = (timeStr || "23:59").split(":").map(Number);
  const scheduledDt = new Date(y, mo-1, d, h, mi, 0);
  if (new Date() > scheduledDt) return "overdue"; // past time, in grace period
  if (calDays === 0) return "today";
  if (calDays <= 3) return "soon";
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
    const urgency = apptUrgency(a.date, a.time, a.done);
    if (filter==="upcoming") return !a.done && (d >= 0 || urgency === "overdue");
    if (filter==="past")     return !a.done && d < 0 && urgency !== "overdue";
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
    done:    { bg: dark?"#1a1a1a":"#f5f5f5",  border:"#bbb",    badge:"✓",          badgeBg:"#9e9e9e" },
    past:    { bg: dark?"#2a1010":"#fff3e0",   border:"#ff7043", badge:"⚠️",          badgeBg:"#ff7043" },
    overdue: { bg: dark?"#2a1a10":"#fff8e1",   border:"#ff6f00", badge:"⏰ En cours", badgeBg:"#ff6f00" },
    today:   { bg: dark?"#1a2a10":"#e8f5e9",   border:"#4caf50", badge:"Aujourd'hui", badgeBg:"#4caf50" },
    soon:    { bg: dark?"#1a1a2a":"#fff8e1",   border:"#ffc107", badge:"Bientôt",     badgeBg:"#ffc107" },
    future:  { bg: dark?"#1a1a2e":"#fafafa",   border:"#e8c5a8", badge:"",            badgeBg:"transparent" },
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
        // Actual elapsed since scheduled time (without grace)
        const [ay,amo,ad] = a.date.split("-").map(Number);
        const [ah,ami] = (a.time||"23:59").split(":").map(Number);
        const scheduledDt = new Date(ay,amo-1,ad,ah,ami,0);
        const elapsedMin = Math.max(0, Math.floor((new Date()-scheduledDt)/60000));
        const timingLabel = urgency==="overdue"
          ? `Il y a ${elapsedMin}min ⏳`
          : d < 0
          ? `Il y a ${Math.abs(calDays)===0?"moins d'1j":Math.abs(calDays)+"j"}`
          : calDays===0 ? "Aujourd'hui"
          : calDays===1 ? "Demain"
          : `Dans ${calDays}j`;
        const timingColor = urgency==="overdue" ? "#ff6f00" : d<0?"#ff7043":calDays===0?"#4caf50":calDays<=3?"#ff9800":textSecondary;
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

// ── NextFeedingProgress (Lab component) ──────────────────────────────────────
function NextFeedingProgress({ lastFeeding, dark, textPrimary, textSecondary }) {
  const [now, setNow] = useState(new Date());

  // Refresh every 30 seconds
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!lastFeeding) return (
    <div style={{textAlign:"center",color:"#aaa",padding:"20px 0",fontSize:13}}>
      Aucun boire enregistré.
    </div>
  );

  const [y,mo,d] = lastFeeding.date.split("-").map(Number);
  const [h,mi]   = lastFeeding.time.split(":").map(Number);
  const lastDt   = new Date(y, mo-1, d, h, mi, 0);
  const totalMins = (parseInt(lastFeeding.durationH)||0)*60 + (parseInt(lastFeeding.durationM)||0);

  const elapsedMs  = now - lastDt;
  const elapsedMin = Math.max(0, Math.floor(elapsedMs / 60000));
  const elapsedH   = Math.floor(elapsedMin / 60);
  const elapsedM   = elapsedMin % 60;

  // Default interval = duration of last feeding, minimum 2h if unknown
  const intervalMin = totalMins > 0 ? totalMins : 120;
  const progress    = Math.min(1, elapsedMin / intervalMin);
  const remaining   = Math.max(0, intervalMin - elapsedMin);
  const remH        = Math.floor(remaining / 60);
  const remM        = remaining % 60;
  const isOverdue   = elapsedMin > intervalMin;

  // Color shifts green → yellow → red
  const pct = progress;
  const barColor = pct < 0.6 ? "#4caf50" : pct < 0.85 ? "#ff9800" : "#e53935";
  const bgColor  = dark
    ? (pct < 0.6 ? "#1a3020" : pct < 0.85 ? "#3a2a10" : "#3a1010")
    : (pct < 0.6 ? "#e8f5e9" : pct < 0.85 ? "#fff8e1" : "#ffebee");

  return (
    <div style={{background:bgColor,borderRadius:12,padding:"14px 16px",transition:"background 0.5s"}}>
      {/* Header row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{fontSize:12,color:textSecondary,marginBottom:2}}>Dernier boire</div>
          <div style={{fontSize:16,fontWeight:"bold",color:textPrimary}}>
            {lastFeeding.time} · il y a {elapsedH>0?`${elapsedH}h `:""}{elapsedM}min
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          {isOverdue ? (
            <div style={{fontSize:13,fontWeight:"bold",color:"#e53935"}}>⚠️ En retard</div>
          ) : (
            <>
              <div style={{fontSize:12,color:textSecondary,marginBottom:2}}>Prochain boire</div>
              <div style={{fontSize:16,fontWeight:"bold",color:barColor}}>
                dans {remH>0?`${remH}h `:""}{remM}min
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{background:dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)",borderRadius:20,height:14,overflow:"hidden",marginBottom:8}}>
        <div style={{
          height:"100%",
          width:`${Math.min(100, progress*100)}%`,
          background:`linear-gradient(90deg, #4caf50, ${barColor})`,
          borderRadius:20,
          transition:"width 0.5s ease, background 0.5s ease",
          position:"relative",
          overflow:"hidden",
        }}>
          {/* Animated shimmer */}
          <div style={{
            position:"absolute",inset:0,
            background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.25) 50%,transparent 100%)",
            animation:"shimmer 2s infinite",
          }}/>
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>

      {/* Labels */}
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:textSecondary}}>
        <span>🍼 {lastFeeding.time}</span>
        <span>{Math.round(progress*100)}%</span>
        {totalMins > 0 && (
          <span>⏰ {formatDuration(intervalMin)}</span>
        )}
      </div>

      {/* Next feeding time */}
      {!isOverdue && totalMins > 0 && (
        <div style={{marginTop:8,textAlign:"center",fontSize:12,color:barColor,fontWeight:"bold"}}>
          ➜ Prochain boire vers {getNextFeedingTime(lastFeeding.time, intervalMin)}
        </div>
      )}

      {totalMins === 0 && (
        <div style={{marginTop:6,fontSize:10,color:textSecondary,textAlign:"center",fontStyle:"italic"}}>
          Durée du dernier boire non renseignée — intervalle estimé à 2h
        </div>
      )}
    </div>
  );
}



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
    const semainesResteMois = Math.floor((diffDays - mois*30.44) / 7);
    const ans = Math.floor(diffDays / 365);
    const moisResteAns = Math.floor((diffDays % 365) / 30.44);

    let ageStr = "";
    let subStr = "";
    if (diffDays < 7) {
      ageStr = `${diffDays} jour${diffDays>1?"s":""} ${diffHours%24}h`;
      subStr = `${diffDays} jours ${diffHours%24}h`;
    } else if (diffDays < 31) {
      ageStr = `${semaines} sem${jourReste>0?` ${jourReste}j`:""}`;
      subStr = `${diffDays} jours ${diffHours%24}h`;
    } else if (mois < 12) {
      ageStr = `${mois} mois${semainesResteMois>0?` ${semainesResteMois} sem`:""}`;
      subStr = `${semaines} sem${jourReste>0?` ${jourReste}j`:""}`;
    } else {
      ageStr = `${ans} an${ans>1?"s":""}${moisResteAns>0?` ${moisResteAns} mois`:""}`;
      subStr = `${mois} mois${semainesResteMois>0?` ${semainesResteMois} sem`:""}`;
    }    return { ageStr, subStr, diffDays, diffHours };
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
                <div style={{fontSize:11, color:dark?"#5a8aaa":"#5a8aaa"}}>
                  {ageBlock.subStr} · né à {profile.heureNaissance || "—"}
                </div>
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




