import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { todayStr, getNow, formatDate } from "../helpers.js";
import { btnPrimaryBase, btnSecondaryBase } from "../constants.js";
import { Label } from "./ui.jsx";

// ── TireLaitTab ───────────────────────────────────────────────────────────────

export function TireLaitTab({ tireLait, dark, cardBg, textPrimary, textSecondary, dynInputStyle, borderColor, setConfirmDelete, showToast, onFormOpen, onFormClose }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ date: todayStr(), time: getNow(), quantite: "", note: "" });
  const [showStats, setShowStats] = useState(false);
  const [viewMode, setViewMode] = useState("auto");
  const [collapsedDays, setCollapsedDays] = useState({});
  const [graphMode, setGraphMode] = useState("mois");
  const [graphDay, setGraphDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const prevMonthRef = useRef(selectedMonth);

  useEffect(() => {
    if (prevMonthRef.current !== selectedMonth) {
      prevMonthRef.current = selectedMonth;
      setGraphDay("");
    }
  }, [selectedMonth]);

  function prevMonth() {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMonth() {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function mLabel(ym) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  const allMonths = [...new Set(tireLait.map(e => e.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a));
  const sortedAll = [...tireLait].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const grouped = sortedAll.reduce((acc, e) => { if (!acc[e.date]) acc[e.date] = []; acc[e.date].push(e); return acc; }, {});
  const filteredDates = Object.keys(grouped).filter(d => d.startsWith(selectedMonth)).sort((a, b) => b.localeCompare(a));

  const daysInMonth = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const total = new Date(y, m, 0).getDate();
    return Array.from({ length: total }, (_, i) => `${selectedMonth}-${String(i + 1).padStart(2, "0")}`);
  })();

  function isDayCollapsed(date, i) {
    if (viewMode === "resume") return true;
    if (viewMode === "auto") return i >= 2;
    return !!collapsedDays[date];
  }
  function toggleDay(date) {
    if (viewMode === "auto") { setViewMode("libre"); setCollapsedDays({}); return; }
    setCollapsedDays(p => ({ ...p, [date]: !p[date] }));
  }
  function setVM(m) { setViewMode(m); if (m !== "libre") setCollapsedDays({}); }

  async function handleSubmit() {
    if (!form.quantite || !form.date) { showToast("⚠️ Quantité et date requises", "#ff9800"); return; }
    const id = editId || String(Date.now());
    await setDoc(doc(db, "tireLait", id), { ...form });
    showToast(editId ? "✏️ Session modifiée !" : "🍼 Session ajoutée !");
    setForm({ date: todayStr(), time: getNow(), quantite: "", note: "" });
    setEditId(null); setShowForm(false); onFormClose?.();
  }
  function handleEdit(e) { setForm({ date: e.date, time: e.time, quantite: e.quantite, note: e.note || "" }); setEditId(e.id); setShowForm(true); onFormOpen?.(); }
  function handleDelete(id) { setConfirmDelete({ message: "Supprimer cette session ?", onConfirm: () => { deleteDoc(doc(db, "tireLait", id)); showToast("🗑️ Supprimé", "#e8906a"); } }); }

  const monthE = tireLait.filter(e => e.date.startsWith(selectedMonth));
  const monthDays = [...new Set(monthE.map(e => e.date))].length;
  const monthTotal = monthE.reduce((s, e) => s + (parseFloat(e.quantite) || 0), 0);
  const monthAvgDay = monthDays > 0 ? (monthTotal / monthDays).toFixed(0) : 0;
  const monthAvgSess = monthE.length > 0 ? (monthTotal / monthE.length).toFixed(0) : 0;
  const allTotal = tireLait.reduce((s, e) => s + (parseFloat(e.quantite) || 0), 0);
  const allDays = [...new Set(tireLait.map(e => e.date))].length;
  const allAvgDay = allDays > 0 ? (allTotal / allDays).toFixed(0) : 0;
  const allAvgSess = tireLait.length > 0 ? (allTotal / tireLait.length).toFixed(0) : 0;

  const graphDataMois = daysInMonth.map(date => {
    const tot = (grouped[date] || []).reduce((s, e) => s + (parseFloat(e.quantite) || 0), 0);
    return { label: date.slice(8), val: tot };
  }).filter(d => d.val > 0);

  const daysInMonthWithData = daysInMonth.filter(d => grouped[d]);
  const validGraphDay = (() => {
    if (graphDay && graphDay.startsWith(selectedMonth) && grouped[graphDay]) return graphDay;
    const today = todayStr();
    if (today.startsWith(selectedMonth) && grouped[today]) return today;
    if (daysInMonthWithData.length > 0) return daysInMonthWithData[daysInMonthWithData.length - 1];
    return selectedMonth + "-01";
  })();

  const graphDataJour = (grouped[validGraphDay] || [])
    .map(e => ({ label: e.time, val: parseFloat(e.quantite) || 0 }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const graphYear = selectedMonth.slice(0, 4);
  const graphDataAnnee = Array.from({ length: 12 }, (_, i) => {
    const mo = String(i + 1).padStart(2, "0");
    const ym = `${graphYear}-${mo}`;
    const tot = tireLait.filter(e => e.date.startsWith(ym)).reduce((s, e) => s + (parseFloat(e.quantite) || 0), 0);
    return { label: new Date(parseInt(graphYear), i, 1).toLocaleDateString("fr-FR", { month: "short" }), val: tot };
  });

  const graphData = graphMode === "mois" ? graphDataMois
    : graphMode === "jour" ? graphDataJour
    : graphDataAnnee.filter(d => d.val > 0);
  const maxVal = Math.max(...graphData.map(d => d.val), 1);
  const textCol = dark ? "#aaa" : "#888";
  const W = 320, H = 130, padL = 40, padR = 8, padT = 12, padB = 24;
  const gW = W - padL - padR, gH = H - padT - padB;
  const pxBar = (i, n) => padL + (i / n) * gW + (gW / n - Math.max(4, Math.min(22, gW / n - 4))) / 2;
  const barW = (n) => Math.max(4, Math.min(22, gW / n - 4));
  const py = v => padT + gH - (v / maxVal) * gH;
  const gridCol = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const borderCol = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  return (
    <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: textPrimary }}>🍼 Tire-Lait</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowStats(v => !v)} style={{ padding: "7px 12px", borderRadius: 20, border: `1.5px solid ${showStats ? (dark ? "#f48fb1" : "#e8906a") : borderColor}`, background: showStats ? (dark ? "rgba(244,143,177,0.15)" : "rgba(232,144,106,0.1)") : "transparent", color: showStats ? (dark ? "#f48fb1" : "#e8906a") : textSecondary, fontWeight: "bold", fontSize: 12, cursor: "pointer" }}>📊</button>
          <div style={{ display: "flex", borderRadius: 20, border: `1.5px solid ${dark ? "#3a3a5e" : "#e8c5a8"}`, overflow: "hidden", background: dark ? "#1e1e30" : "#fdf6f0" }}>
            {[{ m: "auto", i: "📅" }, { m: "libre", i: "✏️" }, { m: "resume", i: "📋" }].map(({ m, i }, idx) => (
              <button key={m} onClick={() => setVM(m)} style={{ padding: "7px 10px", border: "none", borderLeft: idx > 0 ? `1px solid ${dark ? "#3a3a5e" : "#e8c5a8"}` : "none", background: viewMode === m ? (dark ? "rgba(244,143,177,0.25)" : "rgba(232,144,106,0.18)") : "transparent", color: viewMode === m ? (dark ? "#f48fb1" : "#e8906a") : textSecondary, fontWeight: viewMode === m ? "bold" : "normal", fontSize: 13, cursor: "pointer" }}>{i}</button>
            ))}
          </div>
          <button onClick={() => { setForm({ date: todayStr(), time: getNow(), quantite: "", note: "" }); setEditId(null); setShowForm(true); onFormOpen?.(); }} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#1565c0,#42a5f5)", color: "white", fontSize: 24, fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 12px rgba(21,101,192,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div style={{ background: cardBg, borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: "bold", color: dark ? "#90caf9" : "#1565c0", marginBottom: 6 }}>📅 {mLabel(selectedMonth)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span style={{ background: dark ? "#1a2a3a" : "#e3f2fd", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#90caf9" : "#1565c0", fontWeight: "bold" }}>🍼 {monthTotal.toFixed(0)} ml</span>
              <span style={{ background: dark ? "#1a2a3a" : "#e3f2fd", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#90caf9" : "#1565c0", fontWeight: "bold" }}>📋 {monthE.length} sessions</span>
              <span style={{ background: dark ? "#1a2a3a" : "#e3f2fd", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#90caf9" : "#1565c0", fontWeight: "bold" }}>📈 {monthAvgDay} ml/j</span>
              <span style={{ background: dark ? "#1a2a3a" : "#e3f2fd", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#90caf9" : "#1565c0", fontWeight: "bold" }}>⚗️ {monthAvgSess} ml/sess.</span>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: "bold", color: textSecondary, marginBottom: 6 }}>📊 Depuis le début</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span style={{ background: dark ? "#2a2a2a" : "#f5f5f5", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: textSecondary, fontWeight: "bold" }}>🍼 {allTotal.toFixed(0)} ml</span>
              <span style={{ background: dark ? "#2a2a2a" : "#f5f5f5", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: textSecondary, fontWeight: "bold" }}>📋 {tireLait.length} sessions</span>
              <span style={{ background: dark ? "#2a2a2a" : "#f5f5f5", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: textSecondary, fontWeight: "bold" }}>📈 {allAvgDay} ml/j</span>
              <span style={{ background: dark ? "#2a2a2a" : "#f5f5f5", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: textSecondary, fontWeight: "bold" }}>⚗️ {allAvgSess} ml/sess.</span>
            </div>
          </div>
        </div>
      )}

      {/* Month nav */}
      <div style={{ background: dark ? "#2a2a3e" : "#fff8f0", borderRadius: 14, padding: "8px 12px", marginBottom: 14, border: `1px solid ${dark ? "#3a3a5e" : "#f0d5c0"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={prevMonth} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: dark ? "#3a3a5e" : "#f5c6a0", color: textPrimary, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>‹</button>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ flex: 1, textAlign: "center", background: "transparent", border: "none", fontSize: 14, fontWeight: "bold", color: textPrimary, cursor: "pointer", fontFamily: "Georgia,serif", outline: "none" }}>
          {([...new Set([selectedMonth, ...allMonths])]).sort((a, b) => b.localeCompare(a)).map(ym => (
            <option key={ym} value={ym} style={{ background: dark ? "#2a2a3e" : "white" }}>{mLabel(ym)}</option>
          ))}
        </select>
        <button onClick={nextMonth} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: dark ? "#3a3a5e" : "#f5c6a0", color: textPrimary, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>›</button>
      </div>

      {/* Graph */}
      <div style={{ background: cardBg, borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", borderRadius: 20, border: `1.5px solid ${dark ? "#3a3a5e" : "#e8c5a8"}`, overflow: "hidden" }}>
            {[["mois", "📆 Mois"], ["jour", "📅 Jour"], ["annee", "📊 " + graphYear]].map(([m, l], i) => (
              <button key={m} onClick={() => setGraphMode(m)} style={{ padding: "5px 10px", border: "none", borderLeft: i > 0 ? `1px solid ${dark ? "#3a3a5e" : "#e8c5a8"}` : "none", background: graphMode === m ? (dark ? "rgba(66,165,245,0.25)" : "#e3f2fd") : "transparent", color: graphMode === m ? "#1565c0" : textSecondary, fontWeight: graphMode === m ? "bold" : "normal", fontSize: 12, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          {graphMode === "jour" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
              <button onClick={() => { const idx = daysInMonthWithData.indexOf(validGraphDay); if (idx > 0) setGraphDay(daysInMonthWithData[idx - 1]); }} disabled={daysInMonthWithData.indexOf(validGraphDay) <= 0} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${dark ? "#444" : "#ddd"}`, background: "transparent", color: textPrimary, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: daysInMonthWithData.indexOf(validGraphDay) <= 0 ? 0.3 : 1 }}>‹</button>
              <select value={validGraphDay} onChange={e => setGraphDay(e.target.value)} style={{ flex: 1, padding: "4px 6px", borderRadius: 10, border: `1px solid ${dark ? "#444" : "#ddd"}`, background: dark ? "#1e1e30" : "white", color: textPrimary, fontSize: 11, fontFamily: "Georgia,serif", outline: "none", textAlign: "center" }}>
                {daysInMonthWithData.map(d => <option key={d} value={d}>{formatDate(d)}</option>)}
                {!daysInMonthWithData.length && <option value={selectedMonth + "-01"}>Aucune session ce mois</option>}
              </select>
              <button onClick={() => { const idx = daysInMonthWithData.indexOf(validGraphDay); if (idx < daysInMonthWithData.length - 1) setGraphDay(daysInMonthWithData[idx + 1]); }} disabled={daysInMonthWithData.indexOf(validGraphDay) >= daysInMonthWithData.length - 1} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${dark ? "#444" : "#ddd"}`, background: "transparent", color: textPrimary, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: daysInMonthWithData.indexOf(validGraphDay) >= daysInMonthWithData.length - 1 ? 0.3 : 1 }}>›</button>
            </div>
          )}
        </div>
        {graphData.length > 0 ? (() => {
          const fmtV = v => v >= 1000 ? (v / 1000).toFixed(2) + "L" : v + "";
          const rotateLabels = graphMode === "mois" || graphMode === "annee";
          const padBeff = rotateLabels ? 48 : padB;
          const gHeff = H - padT - padBeff;
          const pyR = v => padT + gHeff - (v / maxVal) * gHeff;
          return (
            <svg width={W} height={rotateLabels ? H + 20 : H} style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
              {[0, Math.round(maxVal / 2), Math.round(maxVal)].map((v, i) => (
                <g key={i}>
                  <line x1={padL} y1={pyR(v)} x2={W - padR} y2={pyR(v)} stroke={gridCol} strokeWidth={1} />
                  <text x={padL - 4} y={pyR(v) + 4} textAnchor="end" fontSize={9} fill={textCol}>{v >= 1000 ? (v / 1000).toFixed(1) + "L" : v}</text>
                </g>
              ))}
              <text x={padL - 2} y={padT - 2} fontSize={9} fill={textCol}>ml</text>
              {graphData.map((d, i) => (
                <g key={i}>
                  <rect x={pxBar(i, graphData.length)} y={pyR(d.val)} width={barW(graphData.length)} height={Math.max(1, gHeff - (pyR(d.val) - padT))} fill={dark ? "#42a5f5" : "#1565c0"} fillOpacity={0.75} rx={3} />
                  {rotateLabels ? (
                    <text x={pxBar(i, graphData.length) + barW(graphData.length) / 2} y={padT + gHeff + 6} textAnchor="end" fontSize={8} fill={textCol} transform={`rotate(-90,${pxBar(i, graphData.length) + barW(graphData.length) / 2},${padT + gHeff + 6})`}>{d.label}</text>
                  ) : (
                    <text x={pxBar(i, graphData.length) + barW(graphData.length) / 2} y={H - 4} textAnchor="middle" fontSize={8} fill={textCol}>{d.label}</text>
                  )}
                  {d.val > 0 && (rotateLabels ? (() => {
                    const cx = pxBar(i, graphData.length) + barW(graphData.length) / 2;
                    const topY = pyR(d.val) - 10;
                    return <text transform={`translate(${cx},${topY}) rotate(-90)`} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill={dark ? "#90caf9" : "#1565c0"} fontWeight="bold">{fmtV(Math.round(d.val))}</text>;
                  })() : (
                    <text x={pxBar(i, graphData.length) + barW(graphData.length) / 2} y={pyR(d.val) - 4} textAnchor="middle" fontSize={8} fill={dark ? "#90caf9" : "#1565c0"} fontWeight="bold">{fmtV(Math.round(d.val))}</text>
                  ))}
                </g>
              ))}
            </svg>
          );
        })() : (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: 12, padding: "20px 0" }}>
            {graphMode === "jour" ? "Aucune session ce jour" : graphMode === "annee" ? `Aucune donnée pour ${graphYear}` : "Aucune donnée pour ce mois"}
          </div>
        )}
      </div>

      {/* List */}
      {filteredDates.length === 0 && (
        <div style={{ textAlign: "center", color: "#c9a07a", marginTop: 30, fontSize: 15 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🍼</div>
          Aucune session en {mLabel(selectedMonth)}
        </div>
      )}
      {filteredDates.map((date, index) => {
        const isCollapsed = isDayCollapsed(date, index);
        const entries = grouped[date];
        const dayTotal = entries.reduce((s, e) => s + (parseFloat(e.quantite) || 0), 0);
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div onClick={() => toggleDay(date)} style={{ background: dark ? "linear-gradient(90deg,#1a2a4a,#1a3a4a)" : "linear-gradient(90deg,#e3f2fd,#b3e5fc)", borderRadius: 14, padding: "12px 18px", marginBottom: isCollapsed ? 0 : 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: "bold", color: textPrimary }}>📅 {formatDate(date)}</div>
                <div style={{ fontSize: 12, color: dark ? "#90caf9" : "#1565c0", marginTop: 2 }}>🍼 {entries.length} session{entries.length > 1 ? "s" : ""} · {dayTotal.toFixed(0)} ml</div>
              </div>
              <div style={{ fontSize: 18, color: textPrimary, opacity: 0.6 }}>{isCollapsed ? "▶" : "▼"}</div>
            </div>
            {!isCollapsed && entries.map(e => (
              <div key={e.id} style={{ background: cardBg, borderRadius: 14, padding: "12px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: "4px solid #1565c0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: "bold", color: textPrimary }}>{e.time}</span>
                    <span style={{ background: dark ? "#1a2a3a" : "#e3f2fd", borderRadius: 20, padding: "2px 10px", fontSize: 13, color: dark ? "#90caf9" : "#1565c0", fontWeight: "bold" }}>🍼 {e.quantite} ml</span>
                  </div>
                  {e.note && <div style={{ fontSize: 12, color: "#8a6a5a", fontStyle: "italic" }}>"{e.note}"</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleEdit(e)} style={{ background: dark ? "#1a2a3a" : "#e3f2fd", border: `1px solid ${dark ? "#2a4a6a" : "#90caf9"}`, borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
                  <button onClick={() => handleDelete(e.id)} style={{ background: "#fff0f0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: cardBg, borderRadius: "24px 24px 0 0", padding: "28px 20px 40px", width: "100%", maxWidth: 480, boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px", color: textPrimary, fontSize: 20, textAlign: "center" }}>{editId ? "✏️ Modifier la session" : "🍼 Nouvelle session"}</h2>
            <Label dark={dark}>📅 Date</Label>
            <input type="date" value={form.date} max={todayStr()} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>🕐 Heure</Label>
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>🍼 Quantité (ml)</Label>
            <input type="number" min="0" step="1" placeholder="ex: 80" value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>📝 Note (optionnel)</Label>
            <textarea placeholder="Observations..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} style={{ ...dynInputStyle, resize: "vertical", minHeight: 60 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm({ date: todayStr(), time: getNow(), quantite: "", note: "" }); onFormClose?.(); }} style={btnSecondaryBase}>Annuler</button>
              <button onClick={handleSubmit} style={btnPrimaryBase}>{editId ? "Enregistrer" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
