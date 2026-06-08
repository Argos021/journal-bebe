import { useState } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { btnPrimaryBase, btnSecondaryBase } from "../constants.js";
import { Label } from "./ui.jsx";

// ── Constants ─────────────────────────────────────────────────────────────────

export const APPT_TYPES = [
  { value: "pediatre",  label: "👨‍⚕️ Pédiatre",          color: "#e8906a" },
  { value: "medecin",   label: "🩺 Médecin de famille", color: "#2e7d32" },
  { value: "vaccin",    label: "💉 Vaccin",              color: "#9c27b0" },
  { value: "clsc",      label: "🏥 CLSC",                color: "#0288d1" },
  { value: "therapie",  label: "🤲 Thérapies douces",    color: "#00796b" },
  { value: "urgence",   label: "🚨 Urgence",             color: "#e53935" },
  { value: "autre",     label: "🏥 Autre",               color: "#1565c0" },
];

// ── Helper functions ──────────────────────────────────────────────────────────

export function daysUntil(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = (timeStr || "23:59").split(":").map(Number);
  const dt = new Date(y, mo - 1, d, h, mi, 0);
  const now = new Date();
  return (dt.getTime() + 60 * 60 * 1000 - now.getTime()) / 86400000;
}

export function calendarDaysUntil(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const apptDay = new Date(y, mo - 1, d, 0, 0, 0);
  const todayDay = new Date();
  todayDay.setHours(0, 0, 0, 0);
  return Math.round((apptDay - todayDay) / 86400000);
}

export function apptUrgency(dateStr, timeStr, done) {
  if (done) return "done";
  const elapsed = daysUntil(dateStr, timeStr);
  const calDays = calendarDaysUntil(dateStr);
  if (elapsed < 0) return "past";
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = (timeStr || "23:59").split(":").map(Number);
  const scheduledDt = new Date(y, mo - 1, d, h, mi, 0);
  if (new Date() > scheduledDt) return "overdue";
  if (calDays === 0) return "today";
  if (calDays <= 3) return "soon";
  return "future";
}

function generateICS(appt, babyName) {
  const pad = n => String(n).padStart(2, "0");
  const [y, mo, d] = appt.date.split("-").map(Number);
  const [h, mi] = (appt.time || "09:00").split(":").map(Number);
  const dt = new Date(y, mo - 1, d, h, mi, 0);
  const end = new Date(dt.getTime() + 60 * 60 * 1000);
  const now = new Date();
  const fmt = (date) =>
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
  const type = APPT_TYPES.find(t => t.value === appt.type)?.label || "Rendez-vous";
  const sanitize = (s) => (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\r\n;,\\]/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  const summary = sanitize(`${type} - ${appt.titre || babyName}`);
  const description = sanitize(appt.notes || "");
  const location = sanitize(appt.lieu || "");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Journal Bebe//FR",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${appt.id}-${Date.now()}@journalbebe`,
    `DTSTAMP:${fmt(now)}`, `DTSTART:${fmt(dt)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : null,
    location ? `LOCATION:${location}` : null,
    "END:VEVENT", "END:VCALENDAR", "",
  ].filter(l => l !== null).join("\r\n");
  return lines;
}

// ── SanteTab ──────────────────────────────────────────────────────────────────

export function SanteTab({ appointments, setAppointments, dark, cardBg, textPrimary, textSecondary, dynCardStyle, babyName, showToast, dynInputStyle, setConfirmDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("upcoming");
  const [form, setForm] = useState({ date: "", time: "09:00", type: "pediatre", titre: "", lieu: "", notes: "" });

  async function handleSubmit() {
    const missingDate = !form.date;
    const missingTitre = !form.titre.trim();
    if (missingDate || missingTitre) {
      showToast(`⚠️ Manquant : ${[missingTitre ? "titre" : "", missingDate ? "date" : ""].filter(Boolean).join(", ")}`, "#ff9800");
      return;
    }
    const entry = { id: editId || Date.now(), done: false, ...form };
    await setDoc(doc(db, "appointments", String(entry.id)), entry);
    showToast(editId ? "✅ Rendez-vous modifié !" : "📅 Rendez-vous ajouté !");
    setForm({ date: "", time: "09:00", type: "pediatre", titre: "", lieu: "", notes: "" });
    setEditId(null); setShowForm(false);
  }

  function handleEdit(a) {
    setForm({ date: a.date, time: a.time || "09:00", type: a.type, titre: a.titre, lieu: a.lieu || "", notes: a.notes || "" });
    setEditId(a.id); setShowForm(true);
  }

  function handleDelete(id) {
    setConfirmDelete({
      message: "Supprimer ce rendez-vous ?",
      onConfirm: () => { deleteDoc(doc(db, "appointments", String(id))); showToast("🗑️ Supprimé", "#e8906a"); }
    });
  }

  function toggleDone(id) {
    const appt = appointments.find(a => a.id === id);
    if (appt) setDoc(doc(db, "appointments", String(id)), { ...appt, done: !appt.done });
  }

  function downloadICS(appt) {
    const ics = generateICS(appt, babyName);
    try {
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rdv_${appt.date}_${(appt.titre || "bebe").replace(/\s+/g, "_")}.ics`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
      showToast("📅 Fichier .ics téléchargé !");
    } catch (e) {
      const uri = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
      window.open(uri);
      showToast("📅 Ouvre le fichier pour l'ajouter au calendrier");
    }
  }

  const sorted = [...appointments].sort((a, b) => {
    const dA = daysUntil(a.date, a.time);
    const dB = daysUntil(b.date, b.time);
    if (dA >= 0 && dB >= 0) return dA - dB;
    if (dA < 0 && dB < 0) return dB - dA;
    return dA >= 0 ? -1 : 1;
  });

  const filtered = sorted.filter(a => {
    const d = daysUntil(a.date, a.time);
    const urgency = apptUrgency(a.date, a.time, a.done);
    if (filter === "upcoming") return !a.done && (d >= 0 || urgency === "overdue");
    if (filter === "past")     return !a.done && d < 0 && urgency !== "overdue";
    if (filter === "done")     return a.done;
    return true;
  });

  const alerts = appointments.filter(a => {
    const d = daysUntil(a.date, a.time);
    const calDays = calendarDaysUntil(a.date);
    return !a.done && d >= 0 && calDays <= 3;
  });

  const urgencyStyle = {
    done:    { bg: dark ? "#1a1a1a" : "#f5f5f5",  border: "#bbb",    badge: "✓",           badgeBg: "#9e9e9e" },
    past:    { bg: dark ? "#2a1010" : "#fff3e0",   border: "#ff7043", badge: "⚠️",           badgeBg: "#ff7043" },
    overdue: { bg: dark ? "#2a1a10" : "#fff8e1",   border: "#ff6f00", badge: "⏰ En cours",  badgeBg: "#ff6f00" },
    today:   { bg: dark ? "#1a2a10" : "#e8f5e9",   border: "#4caf50", badge: "Aujourd'hui",  badgeBg: "#4caf50" },
    soon:    { bg: dark ? "#1a1a2a" : "#fff8e1",   border: "#ffc107", badge: "Bientôt",      badgeBg: "#ffc107" },
    future:  { bg: dark ? "#1a1a2e" : "#fafafa",   border: "#e8c5a8", badge: "",             badgeBg: "transparent" },
  };

  return (
    <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: textPrimary }}>🏥 Santé & Rendez-vous</h2>
        <button onClick={() => { setForm({ date: "", time: "09:00", type: "pediatre", titre: "", lieu: "", notes: "" }); setEditId(null); setShowForm(true); }}
          style={{ background: "linear-gradient(135deg,#e8906a,#e06b8a)", color: "white", border: "none", borderRadius: 50, padding: "9px 16px", fontSize: 13, fontWeight: "bold", cursor: "pointer" }}>
          + Ajouter
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ background: dark ? "#2a2010" : "#fff8e1", border: "2px solid #ffc107", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#f57f17", marginBottom: 6 }}>⚠️ Rappels</div>
          {alerts.map(a => {
            const calDays = calendarDaysUntil(a.date);
            const type = APPT_TYPES.find(t => t.value === a.type);
            const timing = calDays === 0 ? "Aujourd'hui" : calDays === 1 ? "Demain" : `Dans ${calDays} jours`;
            return (
              <div key={a.id} style={{ fontSize: 12, color: dark ? "#ffe082" : "#5d4037", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: "bold", color: calDays === 0 ? "#4caf50" : calDays === 1 ? "#ff9800" : "#f57f17" }}>{timing}</span>
                <span>· {type?.label} · <strong>{a.titre}</strong>{a.time ? ` · ${a.time}` : ""}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
        {[["upcoming", "À venir"], ["past", "Passés"], ["done", "Complétés"], ["all", "Tous"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ padding: "5px 12px", borderRadius: 20, border: "2px solid", borderColor: filter === val ? "#e8906a" : "#ddd", background: filter === val ? (dark ? "rgba(232,144,106,0.2)" : "#fff0e8") : (dark ? "#1e1e30" : "#fafafa"), color: filter === val ? "#e8906a" : (dark ? "#888" : "#aaa"), fontWeight: "bold", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#c9a07a", marginTop: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏥</div>
          Aucun rendez-vous {filter !== "all" ? "dans cette catégorie" : ""}.
        </div>
      )}

      {filtered.map(a => {
        const urgency = apptUrgency(a.date, a.time, a.done);
        const us = urgencyStyle[urgency];
        const type = APPT_TYPES.find(t => t.value === a.type);
        const d = daysUntil(a.date, a.time);
        const calDays = calendarDaysUntil(a.date);
        const [ay, amo, ad] = a.date.split("-").map(Number);
        const [ah, ami] = (a.time || "23:59").split(":").map(Number);
        const scheduledDt = new Date(ay, amo - 1, ad, ah, ami, 0);
        const elapsedMin = Math.max(0, Math.floor((new Date() - scheduledDt) / 60000));
        const timingLabel = urgency === "overdue"
          ? `Il y a ${elapsedMin}min ⏳`
          : d < 0
          ? `Il y a ${Math.abs(calDays) === 0 ? "moins d'1j" : Math.abs(calDays) + "j"}`
          : calDays === 0 ? "Aujourd'hui"
          : calDays === 1 ? "Demain"
          : `Dans ${calDays}j`;
        const timingColor = urgency === "overdue" ? "#ff6f00" : d < 0 ? "#ff7043" : calDays === 0 ? "#4caf50" : calDays <= 3 ? "#ff9800" : textSecondary;

        return (
          <div key={a.id} style={{ background: us.bg, borderRadius: 16, padding: "14px 16px", marginBottom: 12, border: `2px solid ${us.border}`, opacity: a.done ? 0.65 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: type?.color || textPrimary }}>{type?.label}</span>
                  {us.badge && <span style={{ background: us.badgeBg, color: "white", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: "bold" }}>{us.badge}</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: "bold", color: textPrimary, marginBottom: 2 }}>{a.titre}</div>
                <div style={{ fontSize: 12, color: textSecondary }}>
                  📅 {new Date(a.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  {a.time && <span> · 🕐 {a.time}</span>}
                  {!a.done && <span style={{ marginLeft: 6, color: timingColor, fontWeight: "bold" }}>{timingLabel}</span>}
                </div>
                {a.lieu && <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>📍 {a.lieu}</div>}
                {a.notes && <div style={{ fontSize: 12, color: "#8a6a5a", fontStyle: "italic", marginTop: 4 }}>"{a.notes}"</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 10 }}>
                <button onClick={() => toggleDone(a.id)} title={a.done ? "Marquer non complété" : "Marquer complété"}
                  style={{ background: a.done ? "#e8f5e9" : "#f5f5f5", border: `1.5px solid ${a.done ? "#4caf50" : "#ddd"}`, borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {a.done ? "✅" : "⬜"}
                </button>
                <button onClick={() => downloadICS(a)} title="Ajouter au calendrier"
                  style={{ background: "#e3f2fd", border: "1.5px solid #1565c0", borderRadius: 8, width: 32, height: 32, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  📅
                </button>
                <button onClick={() => handleEdit(a)} style={{ background: "#f0f8ff", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
                <button onClick={() => handleDelete(a.id)} style={{ background: "#fff0f0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🗑️</button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: cardBg, borderRadius: "24px 24px 0 0", padding: "28px 20px 40px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px", color: textPrimary, fontSize: 20, textAlign: "center" }}>{editId ? "✏️ Modifier" : "📅 Nouveau rendez-vous"}</h2>

            <Label dark={dark}>🏷️ Type</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {APPT_TYPES.map(t => (
                <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  style={{ padding: "7px 14px", borderRadius: 20, border: "2px solid", borderColor: form.type === t.value ? t.color : "#ddd", background: form.type === t.value ? (dark ? t.color + "33" : t.color + "22") : (dark ? "#1e1e30" : "#fafafa"), color: form.type === t.value ? t.color : (dark ? "#888" : "#aaa"), fontWeight: "bold", fontSize: 13, cursor: "pointer" }}>
                  {t.label}
                </button>
              ))}
            </div>

            <Label dark={dark}>📝 Titre / Description</Label>
            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="ex: Visite 2 mois, Vaccins DTP..." style={dynInputStyle} />

            <Label dark={dark}>📅 Date</Label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={dynInputStyle} />

            <Label dark={dark}>🕐 Heure</Label>
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={dynInputStyle} />

            <Label dark={dark}>📍 Lieu (optionnel)</Label>
            <input value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} placeholder="ex: Clinique, CLSC..." style={dynInputStyle} />

            <Label dark={dark}>📝 Notes (optionnel)</Label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Questions à poser, informations..." rows={3} style={{ ...dynInputStyle, resize: "vertical", minHeight: 70 }} />

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={btnSecondaryBase}>Annuler</button>
              <button onClick={handleSubmit} style={btnPrimaryBase}>{editId ? "Enregistrer" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
