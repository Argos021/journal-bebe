import { useState, useEffect, useRef } from "react";
import { db } from "./firebase.js";
import { doc, collection, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";

import { APP_VERSION, HOURS_OPTIONS, MINUTES_OPTIONS, inputStyleBase, btnPrimaryBase, btnSecondaryBase } from "./constants.js";
import { todayStr, getNow, formatDuration, getNextFeedingTime, timeSince } from "./helpers.js";
import { SectionCard, Label, ToggleBtn, btnOptionStyle, NextFeedingProgress } from "./components/ui.jsx";
import { ProfileTab } from "./components/ProfileTab.jsx";
import { JournalTab } from "./components/JournalTab.jsx";
import { TireLaitTab } from "./components/TireLaitTab.jsx";
import { GrowthTab } from "./components/GrowthTab.jsx";
import { SanteTab, daysUntil, calendarDaysUntil } from "./components/SanteTab.jsx";

// ── Initial form state ────────────────────────────────────────────────────────

const initialForm = {
  date: todayStr(), time: getNow(), durationH: 3, durationM: 0,
  seinPremier: null, complMaternel: "", complCommercial: "", pipi: false, caca: false,
  vitamineD: false, nombril: false, yeux: false, regurgi: 0, note: "",
};

// ── Main App ──────────────────────────────────────────────────────────────────

export default function BabyTracker({ onRegisterShowBoire, onRegisterShowCouche, onTabChange, onFormOpen, onFormClose }) {
  const [feedings, setFeedings] = useState([]);
  const [tireLait, setTireLait] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [settings, setSettings] = useState({ darkMode: "off", babyName: "Bébé" });
  const [profile, setProfile] = useState({ nom: "", dateNaissance: "", heureNaissance: "", sexe: "", poidsNaissance: "", tailleNaissance: "", perimCranien: "", typeAlimentation: "" });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const VALID_TABS = ["profil", "journal", "tirelait", "croissance", "sante", "options"];
  const [tab, setTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return VALID_TABS.includes(hash) ? hash : "journal";
  });

  function handleTabChange(t) { setTab(t); window.location.hash = t; onTabChange?.(t); }

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (VALID_TABS.includes(hash)) setTab(hash);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Register FAB callbacks
  useEffect(() => {
    onRegisterShowBoire?.(() => { setForm({ ...initialForm, date: todayStr(), time: getNow() }); setShowForm(true); setEditId(null); onFormOpen?.(); });
    onRegisterShowCouche?.(() => { setCoucheForm({ date: todayStr(), time: getNow(), pipi: false, caca: false, note: "" }); setShowCoucheForm(true); onFormOpen?.(); });
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [viewMode, setViewMode] = useState(() => { try { return localStorage.getItem("journalViewMode") || "auto"; } catch { return "auto"; } });
  const [showStats, setShowStats] = useState(false);
  const [journalGraphMode, setJournalGraphMode] = useState("mois");
  const [journalGraphDay, setJournalGraphDay] = useState("");
  const [collapsedDays, setCollapsedDays] = useState(() => { try { return JSON.parse(localStorage.getItem("collapsedDays") || "{}"); } catch { return {}; } });

  function setViewModeAndSave(mode) {
    setViewMode(mode);
    try { localStorage.setItem("journalViewMode", mode); } catch { }
    if (mode !== "libre") { setCollapsedDays({}); try { localStorage.setItem("collapsedDays", "{}"); } catch { } }
  }

  function toggleDayCollapse(date, sortedDates) {
    if (viewMode === "auto") {
      setViewModeAndSave("libre");
      const next = {};
      sortedDates.forEach((d, i) => { if (i >= 2) next[d] = true; });
      next[date] = !next[date];
      setCollapsedDays(next);
      try { localStorage.setItem("collapsedDays", JSON.stringify(next)); } catch { }
      return;
    }
    setCollapsedDays(prev => {
      const next = { ...prev, [date]: !prev[date] };
      try { localStorage.setItem("collapsedDays", JSON.stringify(next)); } catch { }
      return next;
    });
  }

  function isDayCollapsed(date, index) {
    if (viewMode === "resume") return true;
    if (viewMode === "auto") return index >= 2;
    return !!collapsedDays[date];
  }

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [showCoucheForm, setShowCoucheForm] = useState(false);
  const [editCoucheId, setEditCoucheId] = useState(null);
  const [coucheForm, setCoucheForm] = useState({ date: todayStr(), time: getNow(), pipi: false, caca: false, note: "" });
  const [showGrowthForm, setShowGrowthForm] = useState(false);
  const [growthForm, setGrowthForm] = useState({ date: todayStr(), poids: "", taille: "", crane: "", note: "" });
  const [growthEditId, setGrowthEditId] = useState(null);
  const [growthInputUnit, setGrowthInputUnit] = useState("g");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [headerCompact, setHeaderCompact] = useState(false);
  const timerRef = useRef(null);
  const importRef = useRef();

  // Theme
  const darkModeSetting = settings.darkMode || "off";
  const dark = darkModeSetting === "on" ? true : darkModeSetting === "off" ? false : (() => { const h = new Date().getHours(); return h >= 20 || h < 6; })();
  const bg = dark ? "#1a1a2e" : "#fdf6f0";
  const cardBg = dark ? "#2a2a3e" : "#fff";
  const textPrimary = dark ? "#f5c6a0" : "#7a3b1e";
  const textSecondary = dark ? "#b05a30" : "#b05a30";
  const borderColor = dark ? "#3a3a5e" : "#e8c5a8";
  const dynInputStyle = { ...inputStyleBase, border: `1.5px solid ${borderColor}`, background: dark ? "#1e1e30" : "#fdf6f0", color: dark ? "#f5deb3" : "#5a3020" };
  const dynCardStyle = { background: cardBg, borderRadius: 16, padding: "16px", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderLeft: "4px solid #e8906a" };

  // Firebase listeners
  useEffect(() => {
    const unsubs = [];
    unsubs.push(onSnapshot(collection(db, "feedings"), snap => { setFeedings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }));
    unsubs.push(onSnapshot(collection(db, "tireLait"), snap => { setTireLait(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }));
    unsubs.push(onSnapshot(collection(db, "growth"), snap => { setGrowth(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }));
    unsubs.push(onSnapshot(collection(db, "appointments"), snap => { setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }));
    unsubs.push(onSnapshot(doc(db, "config", "settings"), snap => { if (snap.exists()) setSettings(snap.data()); }));
    unsubs.push(onSnapshot(doc(db, "config", "profile"), snap => { if (snap.exists()) setProfile(snap.data()); }));
    return () => unsubs.forEach(u => u());
  }, []);

  function saveProfile(newProfile) { setProfile(newProfile); setDoc(doc(db, "config", "profile"), newProfile).catch(() => { }); }
  function saveSettings(newSettings) { setSettings(newSettings); setDoc(doc(db, "config", "settings"), newSettings).catch(() => { }); }

  // Timer
  useEffect(() => {
    if (timerRunning) { timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  function showToast(msg, color = "#4caf50") { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); }

  // Month navigation
  function prevMonth() { const [y, m] = selectedMonth.split("-").map(Number); const d = new Date(y, m - 2, 1); setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
  function nextMonth() { const [y, m] = selectedMonth.split("-").map(Number); const d = new Date(y, m, 1); setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
  function monthLabel(ym) { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); }

  const allMonths = [...new Set(feedings.map(f => f.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a));
  const grouped = feedings.reduce((acc, f) => { if (!acc[f.date]) acc[f.date] = []; acc[f.date].push(f); return acc; }, {});
  const filteredDates = Object.keys(grouped).filter(d => d.startsWith(selectedMonth)).sort((a, b) => b.localeCompare(a));
  const sortedDates = filteredDates;

  const boireEntries = feedings.filter(f => f._type !== "couche");
  const lastFeeding = boireEntries.length > 0 ? boireEntries.reduce((latest, f) => ((f.date + "T" + f.time) > (latest.date + "T" + latest.time) ? f : latest)) : null;
  const lastFeedingAgo = lastFeeding ? timeSince(lastFeeding.date, lastFeeding.time) : null;
  const lastFeedingNext = lastFeeding ? (() => { const totalMins = (parseInt(lastFeeding.durationH) || 0) * 60 + (parseInt(lastFeeding.durationM) || 0) || (parseInt(lastFeeding.duration) || 0); return getNextFeedingTime(lastFeeding.time, totalMins); })() : null;

  // Handlers
  async function handleSubmit() {
    if (!form.time || !form.date) return;
    const id = editId || String(Date.now());
    await setDoc(doc(db, "feedings", id), { ...form });
    showToast(editId ? "Boire modifié !" : "Boire ajouté !");
    setForm({ ...initialForm, date: todayStr(), time: getNow() });
    setEditId(null); setShowForm(false); onFormClose?.();
  }

  function handleEdit(f) {
    let dH = f.durationH !== undefined ? f.durationH : 0, dM = f.durationM !== undefined ? f.durationM : 0;
    if (f.duration && f.durationH === undefined) { const t = parseInt(f.duration) || 0; dH = Math.floor(t / 60); dM = t % 60; }
    let seinPremier = f.seinPremier !== undefined ? f.seinPremier : null;
    if (seinPremier === null && (f.seinGauche || f.seinDroit)) seinPremier = f.seinGauche ? "gauche" : "droite";
    setForm({ date: f.date || todayStr(), time: f.time, durationH: dH, durationM: dM, seinPremier, complMaternel: f.complMaternel !== undefined ? f.complMaternel : (f.complementType === "maternel" ? f.complement || "" : ""), complCommercial: f.complCommercial !== undefined ? f.complCommercial : (f.complementType === "commercial" ? f.complement || "" : ""), pipi: f.pipi, caca: f.caca, vitamineD: f.vitamineD || false, nombril: f.nombril || false, yeux: f.yeux || false, regurgi: f.regurgi || 0, note: f.note });
    setEditId(f.id); setShowForm(true);
  }

  function handleDelete(id) { setConfirmDelete({ message: "Supprimer cette entrée ?", onConfirm: () => { deleteDoc(doc(db, "feedings", String(id))); showToast("Entrée supprimée", "#e8906a"); } }); }

  async function handleAddCouche() {
    if (!coucheForm.pipi && !coucheForm.caca) { showToast("⚠️ Sélectionne pipi ou caca", "#ff9800"); return; }
    const id = editCoucheId || String(Date.now());
    await setDoc(doc(db, "feedings", id), { _type: "couche", ...coucheForm });
    showToast(editCoucheId ? "🧷 Couche modifiée !" : "🧷 Couche ajoutée !");
    setCoucheForm({ date: todayStr(), time: getNow(), pipi: false, caca: false, note: "" });
    setEditCoucheId(null); setShowCoucheForm(false); onFormClose?.();
  }

  function handleEditCouche(f) { setCoucheForm({ date: f.date, time: f.time, pipi: !!f.pipi, caca: !!f.caca, note: f.note || "" }); setEditCoucheId(f.id); setShowCoucheForm(true); onFormOpen?.(); }
  function cancelForm() { setForm({ ...initialForm, date: todayStr(), time: getNow() }); setEditId(null); setShowForm(false); onFormClose?.(); }

  function handleExport() {
    const json = JSON.stringify(feedings, null, 2);
    const a = document.createElement("a"); a.href = "data:application/json;charset=utf-8," + encodeURIComponent(json); a.download = `boires_${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); showToast("📥 Exporté !");
  }

  function handleExportCSV() {
    const headers = ["Date", "Heure", "Durée", "Sein départ", "Complément ml", "Pipi", "Caca", "Vitamine D", "Nombril", "Yeux", "Note"];
    const rows = feedings.map(f => { const dH = parseInt(f.durationH) || 0, dM = parseInt(f.durationM) || 0; const dur = formatDuration(dH * 60 + dM) || ""; return [f.date, f.time, dur, f.seinPremier || "", f.complement || "", f.pipi ? "oui" : "", f.caca ? "oui" : "", f.vitamineD ? "oui" : "", f.nombril ? "oui" : "", f.yeux ? "oui" : "", f.note || ""]; });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `boires_${todayStr()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showToast("📊 CSV exporté !");
  }

  function handleExportPDF() {
    const win = window.open("", "_blank");
    const rows = feedings.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).map(f => { const dH = parseInt(f.durationH) || 0, dM = parseInt(f.durationM) || 0; const dur = formatDuration(dH * 60 + dM) || "—"; const sein = f.seinPremier ? `${f.seinPremier} → ${f.seinPremier === "gauche" ? "droite" : "gauche"}` : "—"; const soins = [f.vitamineD ? "Vit.D" : "", f.nombril ? "Nombril" : "", f.yeux ? "Yeux" : ""].filter(Boolean).join(", ") || "—"; const couche = [f.pipi ? "Pipi" : "", f.caca ? "Caca" : ""].filter(Boolean).join(", ") || "—"; return `<tr><td>${f.date}</td><td>${f.time}</td><td>${dur}</td><td>${sein}</td><td>${f.complement || "—"} ml</td><td>${couche}</td><td>${soins}</td><td>${f.note || "—"}</td></tr>`; }).join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Journal des boires</title><style>body{font-family:Georgia,serif;padding:20px}h1{color:#7a3b1e}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f5c6a0;color:#7a3b1e;padding:6px 8px;text-align:left}td{padding:5px 8px;border-bottom:1px solid #eee}tr:nth-child(even){background:#fdf6f0}</style></head><body><h1>🍼 Journal des boires — ${settings.babyName}</h1><p>Exporté le ${new Date().toLocaleDateString("fr-FR")}</p><table><thead><tr><th>Date</th><th>Heure</th><th>Durée</th><th>Sein</th><th>Complément</th><th>Couche</th><th>Soins</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close(); win.print(); showToast("🖨️ PDF prêt !");
  }

  function handleImportFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => { try { const p = JSON.parse(evt.target.result); if (!Array.isArray(p)) throw new Error(); setPendingImport(p); setShowImportConfirm(true); } catch { showToast("Fichier invalide", "#e53935"); } };
    reader.readAsText(file); e.target.value = "";
  }
  async function confirmImport() {
    const batch = pendingImport || [];
    for (const entry of batch) { const id = String(entry.id || Date.now() + Math.random()); await setDoc(doc(db, "feedings", id), { ...entry, id }); }
    setPendingImport(null); setShowImportConfirm(false); showToast(`${batch.length} boires importés !`);
  }

  async function handleAddGrowth() {
    if (!growthForm.date) return;
    let poidsGrams = growthForm.poids;
    if (growthInputUnit === "lb" && growthForm.poids) poidsGrams = (parseFloat(growthForm.poids) * 453.592).toFixed(0);
    const id = growthEditId || String(Date.now());
    await setDoc(doc(db, "growth", String(id)), { ...growthForm, poids: poidsGrams });
    showToast(growthEditId ? "📏 Mesure modifiée !" : "📏 Mesure ajoutée !");
    setGrowthForm({ date: todayStr(), poids: "", taille: "", crane: "", note: "" }); setGrowthEditId(null); setShowGrowthForm(false);
  }

  function handleEditGrowth(g) {
    let poidsVal = g.poids;
    if (growthInputUnit === "lb" && g.poids) poidsVal = (parseFloat(g.poids) / 453.592).toFixed(2);
    setGrowthForm({ date: g.date, poids: poidsVal, taille: g.taille, crane: g.crane || "", note: g.note || "" }); setGrowthEditId(g.id); setShowGrowthForm(true);
  }

  const durationTotalMins = (parseInt(form.durationH) || 0) * 60 + (parseInt(form.durationM) || 0);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f5c6a0,#f9a8c0)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 60 }}>🍼</div>
      <div style={{ fontSize: 18, fontWeight: "bold", color: "#7a3b1e" }}>Journal Bébé</div>
      <div style={{ fontSize: 14, color: "#b05a30" }}>Connexion en cours...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Georgia',serif", padding: "0 0 120px", transition: "background 0.3s" }}>
      <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: "none" }} />

      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "white", borderRadius: 50, padding: "10px 24px", fontSize: 14, fontWeight: "bold", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 999, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background: dark ? "linear-gradient(135deg,#2a1a3e 0%,#1a2a3e 100%)" : "linear-gradient(135deg,#f5c6a0 0%,#f9a8c0 100%)", borderBottom: `3px solid ${dark ? "#5a3a6e" : "#e8906a"}`, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: headerCompact ? "6px 12px 0" : "14px 16px 0", transition: "padding 0.25s ease", position: "relative" }}>
          <div style={{ position: "absolute", top: headerCompact ? 4 : 8, right: 8, display: "flex", gap: 4 }}>
            <button onClick={() => setHeaderCompact(v => !v)} style={{ background: "transparent", border: "none", borderRadius: "50%", width: 30, height: 30, fontSize: 16, cursor: "pointer", color: textSecondary, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 }}>
              {headerCompact ? "⬇" : "⬆"}
            </button>
            <button onClick={() => handleTabChange("options")} style={{ background: tab === "options" ? (dark ? "rgba(244,143,177,0.2)" : "rgba(232,144,106,0.15)") : "transparent", border: `1.5px solid ${tab === "options" ? (dark ? "#f48fb1" : "#e8906a") : "transparent"}`, borderRadius: "50%", width: 30, height: 30, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⚙️</button>
          </div>

          {headerCompact ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: textPrimary, paddingRight: 72, paddingBottom: 6 }}>
              <span style={{ fontWeight: "bold" }}>🍼 {profile.nom || settings.babyName}</span>
              {lastFeeding && <><span style={{ color: textSecondary }}>· {lastFeeding.time}</span>{lastFeedingAgo && <span style={{ color: textSecondary }}>({lastFeedingAgo})</span>}{lastFeedingNext && <span style={{ color: dark ? "#f48fb1" : "#e06b8a", fontWeight: "bold" }}>· ➜ {lastFeedingNext}</span>}</>}
            </div>
          ) : (
            <div style={{ textAlign: "center", paddingRight: 72 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 22 }}>🍼</span>
                <h1 style={{ margin: 0, fontSize: 20, color: textPrimary, letterSpacing: 1, fontWeight: "bold" }}>{profile.nom || settings.babyName}</h1>
                {profile.dateNaissance && (() => {
                  const timeStr = profile.heureNaissance || "00:00";
                  const diffMs = new Date() - new Date(profile.dateNaissance + "T" + timeStr + ":00");
                  if (diffMs < 0) return null;
                  const diffDays = Math.floor(diffMs / 86400000); const diffHours = Math.floor(diffMs / 3600000);
                  const semaines = Math.floor(diffDays / 7); const jourReste = diffDays % 7;
                  const mois = Math.floor(diffDays / 30.44); const semainesResteMois = Math.floor((diffDays - mois * 30.44) / 7);
                  const ans = Math.floor(diffDays / 365); const moisResteAns = Math.floor((diffDays % 365) / 30.44);
                  let label;
                  if (diffDays < 7) label = `${diffDays}j ${diffHours % 24}h`;
                  else if (diffDays < 31) label = `${semaines} sem${jourReste > 0 ? ` ${jourReste}j` : ""}`;
                  else if (mois < 12) label = `${mois} mois${semainesResteMois > 0 ? ` ${semainesResteMois} sem` : ""}`;
                  else label = `${ans} an${ans > 1 ? "s" : ""}${moisResteAns > 0 ? ` ${moisResteAns} mois` : ""}`;
                  return <span style={{ fontSize: 12, background: dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)", borderRadius: 20, padding: "2px 10px", color: textSecondary, fontWeight: "bold" }}>{label}</span>;
                })()}
              </div>
              <p style={{ margin: "2px 0 8px", color: textSecondary, fontSize: 11 }}>💾 Sauvegarde automatique</p>
              {lastFeeding && (
                <div style={{ background: dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.6)", borderRadius: 10, padding: "6px 12px", marginBottom: 8, fontSize: 12, color: textPrimary, display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  <span style={{ fontWeight: "bold" }}>🍼 {lastFeeding.time}</span>
                  {lastFeedingAgo && <span style={{ color: textSecondary }}>· il y a {lastFeedingAgo}</span>}
                  {lastFeedingNext && <span style={{ color: dark ? "#f48fb1" : "#e06b8a", fontWeight: "bold" }}>· prochain {lastFeedingNext}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav tabs */}
        <div style={{ display: "flex", borderTop: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`, marginTop: 4 }}>
          {[["profil", "👶"], ["journal", "📓"], ["tirelait", "🍼"], ["croissance", "📏"], ["sante", "🏥"]].map(([key, icon]) => {
            const label = { profil: "Profil", journal: "Journal", tirelait: "Tire-Lait", croissance: "Croissance", sante: "Santé" }[key];
            const urgentAppts = appointments.filter(a => { if (a.done) return false; const elapsed = daysUntil(a.date, a.time); const calDays = calendarDaysUntil(a.date); return elapsed >= 0 && calDays <= 3; }).length;
            return (
              <button key={key} onClick={() => handleTabChange(key)} style={{ flex: 1, padding: "8px 0 6px", border: "none", background: "transparent", cursor: "pointer", borderBottom: tab === key ? `3px solid ${dark ? "#f48fb1" : "#e8906a"}` : "3px solid transparent", transition: "all 0.15s", position: "relative" }}>
                <div style={{ fontSize: 16 }}>{icon}</div>
                <div style={{ fontSize: 10, color: tab === key ? textPrimary : (dark ? "#888" : "#b05a30"), fontWeight: tab === key ? "bold" : "normal" }}>{label}</div>
                {key === "sante" && urgentAppts > 0 && <div style={{ position: "absolute", top: 4, right: "18%", background: "#e53935", color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>{urgentAppts}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: cardBg, borderRadius: 20, padding: 28, maxWidth: 320, width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: "0 0 10px", color: textPrimary, fontSize: 17 }}>{confirmDelete.message}</h3>
            <p style={{ color: "#8a6a5a", fontSize: 13, margin: "0 0 20px" }}>Cette action est irréversible.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={btnSecondaryBase}>Annuler</button>
              <button onClick={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }} style={{ ...btnPrimaryBase, background: "#e53935", flex: 2 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Import confirm */}
      {showImportConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: cardBg, borderRadius: 20, padding: 28, maxWidth: 340, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 10px", color: textPrimary }}>Remplacer les données ?</h3>
            <p style={{ color: "#8a6a5a", fontSize: 14, margin: "0 0 20px" }}>Ceci remplacera tous tes boires actuels ({pendingImport?.length} entrées).</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowImportConfirm(false); setPendingImport(null); }} style={btnSecondaryBase}>Annuler</button>
              <button onClick={confirmImport} style={{ ...btnPrimaryBase, background: "#e06b8a" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      {tab === "profil" && <ProfileTab profile={profile} saveProfile={saveProfile} dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} dynInputStyle={dynInputStyle} />}

      {tab === "journal" && (
        <JournalTab
          feedings={feedings} grouped={grouped} sortedDates={sortedDates} filteredDates={filteredDates}
          selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} allMonths={allMonths} monthLabel={monthLabel} prevMonth={prevMonth} nextMonth={nextMonth}
          viewMode={viewMode} setViewModeAndSave={setViewModeAndSave} isDayCollapsed={isDayCollapsed} toggleDayCollapse={toggleDayCollapse}
          showStats={showStats} setShowStats={setShowStats}
          journalGraphMode={journalGraphMode} setJournalGraphMode={setJournalGraphMode} journalGraphDay={journalGraphDay} setJournalGraphDay={setJournalGraphDay}
          timerRunning={timerRunning} setTimerRunning={setTimerRunning} timerSeconds={timerSeconds} setTimerSeconds={setTimerSeconds}
          handleEdit={handleEdit} handleDelete={handleDelete} handleEditCouche={handleEditCouche}
          setCoucheForm={setCoucheForm} setShowCoucheForm={setShowCoucheForm} setForm={setForm} setShowForm={setShowForm} setEditId={setEditId} initialForm={initialForm}
          dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor}
        />
      )}

      {tab === "tirelait" && (
        <TireLaitTab tireLait={tireLait} dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} dynInputStyle={dynInputStyle} borderColor={borderColor} setConfirmDelete={setConfirmDelete} showToast={showToast} onFormOpen={onFormOpen} onFormClose={onFormClose} />
      )}

      {tab === "croissance" && (
        <GrowthTab growth={growth} setGrowth={setGrowth} setShowGrowthForm={setShowGrowthForm} onEdit={handleEditGrowth} profile={profile} dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} dynCardStyle={dynCardStyle} setConfirmDelete={setConfirmDelete} />
      )}

      {tab === "sante" && (
        <SanteTab appointments={appointments} setAppointments={setAppointments} dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} dynCardStyle={dynCardStyle} babyName={profile.nom || settings.babyName} showToast={showToast} dynInputStyle={dynInputStyle} setConfirmDelete={setConfirmDelete} />
      )}

      {tab === "options" && (
        <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, color: textPrimary }}>⚙️ Options</h2>
          <SectionCard dark={dark} cardBg={cardBg}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: textPrimary, marginBottom: 10 }}>🌙 Mode nuit</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ val: "off", label: "☀️ Off" }, { val: "on", label: "🌙 On" }, { val: "auto", label: "🌓 Auto", sub: "20h – 6h" }].map(opt => (
                <button key={opt.val} onClick={() => saveSettings({ ...settings, darkMode: opt.val })}
                  style={{ flex: 1, padding: "10px 4px", borderRadius: 12, border: "2px solid", borderColor: darkModeSetting === opt.val ? "#e06b8a" : "#ddd", background: darkModeSetting === opt.val ? (dark ? "rgba(224,107,138,0.25)" : "#fce4ec") : (dark ? "#1e1e30" : "#fafafa"), color: darkModeSetting === opt.val ? "#c2185b" : (dark ? "#666" : "#aaa"), fontWeight: "bold", fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span>{opt.label}</span>
                  {opt.sub && <span style={{ fontSize: 10, fontWeight: "normal", opacity: 0.8 }}>{opt.sub}</span>}
                </button>
              ))}
            </div>
            {darkModeSetting === "auto" && <div style={{ marginTop: 8, fontSize: 12, color: textSecondary, textAlign: "center" }}>{dark ? "🌙 Mode nuit actif" : "☀️ Mode jour actif"}</div>}
          </SectionCard>
          <SectionCard dark={dark} cardBg={cardBg}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: textPrimary, marginBottom: 12 }}>💾 Données</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={handleExport} style={{ ...btnOptionStyle(dark), borderColor: "#e8906a", color: "#e8906a" }}>📤 Exporter (JSON)</button>
              <button onClick={handleExportCSV} style={{ ...btnOptionStyle(dark), borderColor: "#4caf50", color: "#4caf50" }}>📊 Exporter (CSV / Excel)</button>
              <button onClick={handleExportPDF} style={{ ...btnOptionStyle(dark), borderColor: "#2196f3", color: "#2196f3" }}>🖨️ Imprimer / Exporter PDF</button>
              <button onClick={() => importRef.current.click()} style={{ ...btnOptionStyle(dark), borderColor: "#9c27b0", color: "#9c27b0" }}>📂 Importer (JSON)</button>
            </div>
          </SectionCard>
          <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, color: dark ? "#444" : "#ccc", fontFamily: "monospace" }}>v{APP_VERSION}</div>
          <SectionCard dark={dark} cardBg={cardBg}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: textPrimary, marginBottom: 6 }}>🧪 Laboratoire</div>
            <div style={{ fontSize: 12, color: textSecondary, marginBottom: 10 }}>Tester de nouvelles fonctionnalités sans affecter l'app principale.</div>
            <button onClick={() => handleTabChange("lab")} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "2px solid #9c27b0", background: dark ? "rgba(156,39,176,0.1)" : "#f3e5f5", color: "#9c27b0", fontSize: 14, fontWeight: "bold", cursor: "pointer" }}>🔬 Ouvrir le laboratoire</button>
          </SectionCard>
        </div>
      )}

      {tab === "lab" && (
        <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <button onClick={() => handleTabChange("options")} style={{ background: "transparent", border: `1.5px solid ${borderColor}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, color: textSecondary, cursor: "pointer", fontWeight: "bold" }}>← Options</button>
            <h2 style={{ margin: 0, fontSize: 18, color: "#9c27b0" }}>🔬 Laboratoire</h2>
          </div>
          <p style={{ fontSize: 12, color: textSecondary, marginBottom: 20 }}>Ces fonctionnalités sont en test. Elles n'affectent pas tes données réelles.</p>
          <div style={{ background: cardBg, borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `2px solid ${dark ? "#3a1a5a" : "#e1bee7"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>⏰</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: "bold", color: textPrimary }}>Barre de progression — Prochain boire</div>
                <div style={{ fontSize: 11, color: textSecondary }}>Aperçu visuel du temps écoulé depuis le dernier boire</div>
              </div>
              <span style={{ marginLeft: "auto", background: "#9c27b0", color: "white", fontSize: 10, fontWeight: "bold", padding: "2px 8px", borderRadius: 20 }}>TEST</span>
            </div>
            <NextFeedingProgress lastFeeding={lastFeeding} dark={dark} textPrimary={textPrimary} textSecondary={textSecondary} />
          </div>
        </div>
      )}

      {/* ── Couche Form Modal ── */}
      {showCoucheForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: cardBg, borderRadius: "24px 24px 0 0", padding: "28px 20px 40px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px", color: textPrimary, fontSize: 20, textAlign: "center" }}>{editCoucheId ? "✏️ Modifier la couche" : "🧷 Changement de couche"}</h2>
            <Label dark={dark}>📅 Journée</Label>
            <input type="date" value={coucheForm.date} max={todayStr()} onChange={e => setCoucheForm(f => ({ ...f, date: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>🕐 Heure</Label>
            <input type="time" value={coucheForm.time} onChange={e => setCoucheForm(f => ({ ...f, time: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>Contenu de la couche</Label>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setCoucheForm(f => ({ ...f, pipi: !f.pipi }))} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: "2px solid", borderColor: coucheForm.pipi ? "#7eb8f5" : "#ddd", background: coucheForm.pipi ? (dark ? "rgba(126,184,245,0.2)" : "#ddeeff") : (dark ? "#1e1e30" : "#fafafa"), color: coucheForm.pipi ? (dark ? "#90caf9" : "#1565c0") : (dark ? "#555" : "#aaa"), fontWeight: "bold", fontSize: 16, cursor: "pointer" }}>💧 Pipi</button>
              <button onClick={() => setCoucheForm(f => ({ ...f, caca: !f.caca }))} style={{ flex: 1, padding: "14px 0", borderRadius: 10, border: "2px solid", borderColor: coucheForm.caca ? "#c9a96e" : "#ddd", background: coucheForm.caca ? (dark ? "rgba(201,169,110,0.2)" : "#fdebd0") : (dark ? "#1e1e30" : "#fafafa"), color: coucheForm.caca ? (dark ? "#ffcc80" : "#e65100") : (dark ? "#555" : "#aaa"), fontWeight: "bold", fontSize: 16, cursor: "pointer" }}>💩 Caca</button>
            </div>
            <Label dark={dark}>📝 Note (optionnel)</Label>
            <textarea placeholder="Observations..." value={coucheForm.note} onChange={e => setCoucheForm(f => ({ ...f, note: e.target.value }))} rows={2} style={{ ...dynInputStyle, resize: "vertical", minHeight: 60 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => { setShowCoucheForm(false); setEditCoucheId(null); setCoucheForm({ date: todayStr(), time: getNow(), pipi: false, caca: false, note: "" }); onFormClose?.(); }} style={btnSecondaryBase}>Annuler</button>
              <button onClick={handleAddCouche} style={btnPrimaryBase}>{editCoucheId ? "Enregistrer" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Growth Form Modal ── */}
      {showGrowthForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: cardBg, borderRadius: "24px 24px 0 0", padding: "28px 20px 40px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px", color: textPrimary, fontSize: 20, textAlign: "center" }}>{growthEditId ? "✏️ Modifier la mesure" : "📏 Nouvelle mesure"}</h2>
            <Label dark={dark}>📅 Date</Label>
            <input type="date" value={growthForm.date} max={todayStr()} onChange={e => setGrowthForm(f => ({ ...f, date: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>⚖️ Poids — unité de saisie</Label>
            <div style={{ display: "flex", borderRadius: 20, overflow: "hidden", border: `2px solid ${dark ? "#3a3a5e" : "#e8c5a8"}`, marginBottom: 10, width: "fit-content" }}>
              {[["g", "Grammes (g)"], ["lb", "Livres (lb)"]].map(([unit, label]) => (
                <button key={unit} onClick={() => {
                  if (growthForm.poids) { const val = parseFloat(growthForm.poids); if (unit === "lb" && growthInputUnit === "g") setGrowthForm(f => ({ ...f, poids: (val / 453.592).toFixed(2) })); if (unit === "g" && growthInputUnit === "lb") setGrowthForm(f => ({ ...f, poids: (val * 453.592).toFixed(0) })); }
                  setGrowthInputUnit(unit);
                }} style={{ padding: "6px 18px", border: "none", background: growthInputUnit === unit ? "#e8906a" : (dark ? "#1e1e30" : "#fafafa"), color: growthInputUnit === unit ? "white" : (dark ? "#888" : "#aaa"), fontWeight: "bold", fontSize: 13, cursor: "pointer" }}>{label}</button>
              ))}
            </div>
            <input type="number" min="0" step={growthInputUnit === "lb" ? "0.01" : "1"} placeholder={growthInputUnit === "lb" ? "ex: 7.72" : "ex: 3500"} value={growthForm.poids} onChange={e => setGrowthForm(f => ({ ...f, poids: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>📏 Taille (cm)</Label>
            <input type="number" min="0" step="0.1" placeholder="ex: 52.5" value={growthForm.taille} onChange={e => setGrowthForm(f => ({ ...f, taille: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>🔵 Périmètre crânien (cm)</Label>
            <input type="number" min="0" step="0.1" placeholder="ex: 36.0" value={growthForm.crane || ""} onChange={e => setGrowthForm(f => ({ ...f, crane: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>📝 Note</Label>
            <textarea placeholder="Observations..." value={growthForm.note} onChange={e => setGrowthForm(f => ({ ...f, note: e.target.value }))} rows={2} style={{ ...dynInputStyle, resize: "vertical", minHeight: 60 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => { setShowGrowthForm(false); setGrowthEditId(null); setGrowthForm({ date: todayStr(), poids: "", taille: "", crane: "", note: "" }); }} style={btnSecondaryBase}>Annuler</button>
              <button onClick={handleAddGrowth} style={btnPrimaryBase}>{growthEditId ? "Enregistrer" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feeding Form Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: cardBg, borderRadius: "24px 24px 0 0", padding: "28px 20px 40px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px", color: textPrimary, fontSize: 20, textAlign: "center" }}>{editId ? "Modifier le boire" : "Nouveau boire"}</h2>
            <Label dark={dark}>📅 Journée</Label>
            <input type="date" value={form.date} max={todayStr()} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>🕐 Heure</Label>
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>⏱ Durée du boire</Label>
            <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
              <select value={form.durationH} onChange={e => setForm(f => ({ ...f, durationH: parseInt(e.target.value) }))} style={{ ...dynInputStyle, flex: 1 }}>
                {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}h</option>)}
              </select>
              <select value={form.durationM} onChange={e => setForm(f => ({ ...f, durationM: parseInt(e.target.value) }))} style={{ ...dynInputStyle, flex: 1 }}>
                {MINUTES_OPTIONS.map(m => <option key={m} value={m}>{String(m).padStart(2, "0")} min</option>)}
              </select>
            </div>
            {durationTotalMins > 0 && <div style={{ marginTop: -8, marginBottom: 12, fontSize: 13, color: textSecondary, paddingLeft: 4 }}>➜ Prochain boire vers <strong>{getNextFeedingTime(form.time, durationTotalMins)}</strong></div>}
            <Label dark={dark}>🤱 Sein de départ</Label>
            <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
              {["gauche", "droite"].map(sein => {
                const isFirst = form.seinPremier === sein, isSecond = form.seinPremier !== null && form.seinPremier !== sein;
                return (
                  <button key={sein} onClick={() => setForm(f => ({ ...f, seinPremier: f.seinPremier === sein ? null : sein }))}
                    style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "2px solid", borderColor: isFirst ? "#e06b8a" : isSecond ? "#e8c5a8" : "#ddd", background: isFirst ? "#fce4ec" : isSecond ? (dark ? "#2a2020" : "#fdf6f0") : (dark ? "#1e1e30" : "#fafafa"), cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: "bold", color: isFirst ? "#c2185b" : isSecond ? "#b05a30" : "#aaa" }}>{sein === "gauche" ? "◀ Gauche" : "Droite ▶"}</span>
                    {isFirst && <span style={{ fontSize: 11, background: "#e06b8a", color: "white", borderRadius: 20, padding: "1px 8px", fontWeight: "bold" }}>1er</span>}
                    {isSecond && <span style={{ fontSize: 11, background: "#e8c5a8", color: "#7a3b1e", borderRadius: 20, padding: "1px 8px", fontWeight: "bold" }}>2e</span>}
                    {!isFirst && !isSecond && <span style={{ fontSize: 11, color: "#ccc" }}>—</span>}
                  </button>
                );
              })}
            </div>
            {form.seinPremier && <div style={{ fontSize: 12, color: textSecondary, marginBottom: 14, paddingLeft: 4 }}>Départ : <strong>{form.seinPremier}</strong> → suite : <strong>{form.seinPremier === "gauche" ? "droite" : "gauche"}</strong></div>}
            {!form.seinPremier && <div style={{ marginBottom: 14 }} />}
            <Label dark={dark}>🥛 Complément de lait</Label>
            <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#c2185b", marginBottom: 4 }}>🤱 Maternel (ml)</div>
                <input type="number" min="0" placeholder="ex: 30" value={form.complMaternel} onChange={e => setForm(f => ({ ...f, complMaternel: e.target.value }))} style={{ ...dynInputStyle, borderColor: "#f9c6d8", marginBottom: 0 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: "bold", color: "#1565c0", marginBottom: 4 }}>🏭 Commercial (ml)</div>
                <input type="number" min="0" placeholder="ex: 30" value={form.complCommercial} onChange={e => setForm(f => ({ ...f, complCommercial: e.target.value }))} style={{ ...dynInputStyle, borderColor: "#bbdefb", marginBottom: 0 }} />
              </div>
            </div>
            {(parseFloat(form.complMaternel) || 0) + (parseFloat(form.complCommercial) || 0) > 0 && <div style={{ fontSize: 12, color: textSecondary, marginBottom: 14, paddingLeft: 2 }}>Total : <strong>{((parseFloat(form.complMaternel) || 0) + (parseFloat(form.complCommercial) || 0)).toFixed(0)} ml</strong></div>}
            {!(parseFloat(form.complMaternel) || 0) && !(parseFloat(form.complCommercial) || 0) && <div style={{ marginBottom: 14 }} />}
            <Label dark={dark}>🧷 Couche</Label>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <ToggleBtn active={form.pipi} onClick={() => setForm(f => ({ ...f, pipi: !f.pipi }))} label="💧 Pipi" color="#7eb8f5" dark={dark} />
              <ToggleBtn active={form.caca} onClick={() => setForm(f => ({ ...f, caca: !f.caca }))} label="💩 Caca" color="#c9a96e" dark={dark} />
            </div>
            <Label dark={dark}>🌿 Soins</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <ToggleBtn active={form.vitamineD} onClick={() => setForm(f => ({ ...f, vitamineD: !f.vitamineD }))} label="☀️ Vitamine D donnée" color="#ffe082" fullWidth dark={dark} />
              <div style={{ display: "flex", gap: 10 }}>
                <ToggleBtn active={form.nombril} onClick={() => setForm(f => ({ ...f, nombril: !f.nombril }))} label="🫧 Nombril" color="#a5d6a7" dark={dark} />
                <ToggleBtn active={form.yeux} onClick={() => setForm(f => ({ ...f, yeux: !f.yeux }))} label="👁️ Yeux" color="#ce93d8" dark={dark} />
              </div>
            </div>
            <Label dark={dark}>🤮 Régurgitations</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <button onClick={() => setForm(f => ({ ...f, regurgi: Math.max(0, (parseInt(f.regurgi) || 0) - 1) }))} style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${dark ? "#555" : "#ddd"}`, background: dark ? "#2a2a3e" : "#f5f5f5", color: textPrimary, fontSize: 20, fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <div style={{ flex: 1, textAlign: "center" }}>
                {(parseInt(form.regurgi) || 0) === 0 ? <span style={{ fontSize: 14, color: dark ? "#555" : "#bbb" }}>Aucune</span> : <span style={{ fontSize: 22, fontWeight: "bold", color: dark ? "#ffe082" : "#f57f17" }}>🤮 {form.regurgi} {parseInt(form.regurgi) === 1 ? "régurgi" : "régurgis"}</span>}
              </div>
              <button onClick={() => setForm(f => ({ ...f, regurgi: (parseInt(f.regurgi) || 0) + 1 }))} style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${dark ? "#555" : "#ddd"}`, background: dark ? "#2a2a3e" : "#f5f5f5", color: textPrimary, fontSize: 20, fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
            <Label dark={dark}>📝 Note</Label>
            <textarea placeholder="Observations..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} style={{ ...dynInputStyle, resize: "vertical", minHeight: 70 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={cancelForm} style={btnSecondaryBase}>Annuler</button>
              <button onClick={handleSubmit} style={btnPrimaryBase}>{editId ? "Enregistrer" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
