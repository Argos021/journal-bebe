import { todayStr, getNow, formatDate } from "../helpers.js";
import { DaySummary } from "./ui.jsx";
import { FeedingCard, CoucheCard } from "./FeedingCard.jsx";

// ── JournalTab ────────────────────────────────────────────────────────────────

export function JournalTab({
  // Data
  feedings, grouped, sortedDates, filteredDates,
  // Month navigation
  selectedMonth, setSelectedMonth, allMonths, monthLabel, prevMonth, nextMonth,
  // View mode
  viewMode, setViewModeAndSave, isDayCollapsed, toggleDayCollapse,
  // Stats
  showStats, setShowStats,
  // Graph
  journalGraphMode, setJournalGraphMode, journalGraphDay, setJournalGraphDay,
  // Timer
  timerRunning, setTimerRunning, timerSeconds, setTimerSeconds,
  // Actions
  handleEdit, handleDelete, handleEditCouche,
  setCoucheForm, setShowCoucheForm, setForm, setShowForm, setEditId, initialForm,
  // Theme
  dark, cardBg, textPrimary, textSecondary, borderColor,
}) {
  const tCol = dark ? "#aaa" : "#888";
  const colorMat = dark ? "#f48fb1" : "#c2185b";
  const colorComm = dark ? "#90caf9" : "#1565c0";
  const colorSolo = dark ? "#e8906a" : "#e06b8a";
  const gridC = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  // Graph calculations
  const jGrouped = feedings.filter(f => f._type !== "couche").reduce((acc, f) => {
    if (!acc[f.date]) acc[f.date] = [];
    acc[f.date].push(f);
    return acc;
  }, {});

  const jDaysInMonth = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const total = new Date(y, m, 0).getDate();
    return Array.from({ length: total }, (_, i) => `${selectedMonth}-${String(i + 1).padStart(2, "0")}`);
  })();

  const jYear = selectedMonth.slice(0, 4);
  const jDaysWithData = jDaysInMonth.filter(d => jGrouped[d]);

  const jValidDay = (() => {
    if (journalGraphDay && journalGraphDay.startsWith(selectedMonth) && jGrouped[journalGraphDay]) return journalGraphDay;
    const today = todayStr();
    if (today.startsWith(selectedMonth) && jGrouped[today]) return today;
    return jDaysWithData.length > 0 ? jDaysWithData[jDaysWithData.length - 1] : selectedMonth + "-01";
  })();

  const getMl = f => {
    const mat = (parseFloat(f.complMaternel) || 0) + ((f.complementType === "maternel") ? (parseFloat(f.complement) || 0) : 0);
    const comm = (parseFloat(f.complCommercial) || 0) + ((f.complementType === "commercial") ? (parseFloat(f.complement) || 0) : 0);
    return { mat, comm, total: mat + comm };
  };

  const jDataMois = jDaysInMonth.map(date => {
    const entries = jGrouped[date] || [];
    const mat = entries.reduce((s, f) => s + getMl(f).mat, 0);
    const comm = entries.reduce((s, f) => s + getMl(f).comm, 0);
    return { label: date.slice(8), mat, comm, val: mat + comm };
  }).filter(d => d.val > 0);

  const jDataJour = (jGrouped[jValidDay] || []).map(f => {
    const { mat, comm, total } = getMl(f);
    return { label: f.time, mat, comm, val: total };
  }).sort((a, b) => a.label.localeCompare(b.label));

  const jDataAnnee = Array.from({ length: 12 }, (_, i) => {
    const mo = String(i + 1).padStart(2, "0");
    const ym = `${jYear}-${mo}`;
    const entries = feedings.filter(f => f._type !== "couche" && f.date.startsWith(ym));
    const mat = entries.reduce((s, f) => s + getMl(f).mat, 0);
    const comm = entries.reduce((s, f) => s + getMl(f).comm, 0);
    const total = mat + comm;
    const label = new Date(parseInt(jYear), i, 1).toLocaleDateString("fr-FR", { month: "short" });
    return { label, mat, comm, val: total };
  }).filter(d => d.val > 0);

  const jData = journalGraphMode === "mois" ? jDataMois : journalGraphMode === "jour" ? jDataJour : jDataAnnee;
  const jMax = Math.max(...jData.map(d => d.val), 1);

  const W2 = 320, H2 = 140, pL = 40, pR = 8, pT = 14, pB = 26;
  const gW2 = W2 - pL - pR;
  const bW = n => Math.max(4, Math.min(24, gW2 / Math.max(n, 1) - 4));
  const bX = (i, n) => pL + (i / Math.max(n, 1)) * gW2 + (gW2 / Math.max(n, 1) - bW(n)) / 2;

  return (
    <div>
      {/* Timer bar */}
      <div style={{ background: dark ? "#2a2a3e" : "#fff8f0", padding: "12px 16px", borderBottom: `1px solid ${dark ? "#3a3a5e" : "#f0d5c0"}`, display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 480, margin: "0 auto" }}>
        <div>
          <div style={{ fontSize: 12, color: textSecondary, fontWeight: "bold" }}>⏱ Minuterie boire</div>
          <div style={{ fontSize: 26, fontWeight: "bold", color: timerRunning ? (dark ? "#f48fb1" : "#e06b8a") : textPrimary, letterSpacing: 2 }}>
            {String(Math.floor(timerSeconds / 3600)).padStart(2, "0")}:{String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, "0")}:{String(timerSeconds % 60).padStart(2, "0")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTimerRunning(v => !v)} style={{ padding: "8px 18px", borderRadius: 20, border: "none", background: timerRunning ? "#e06b8a" : "#e8906a", color: "white", fontWeight: "bold", fontSize: 14, cursor: "pointer" }}>
            {timerRunning ? "⏸ Pause" : "▶ Démarrer"}
          </button>
          <button onClick={() => { setTimerRunning(false); setTimerSeconds(0); }} style={{ padding: "8px 12px", borderRadius: 20, border: `1.5px solid ${borderColor}`, background: "transparent", color: textSecondary, fontWeight: "bold", fontSize: 13, cursor: "pointer" }}>↺</button>
        </div>
      </div>

      {/* View toggle + add buttons */}
      <div style={{ padding: "14px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", borderRadius: 20, border: `1.5px solid ${dark ? "#3a3a5e" : "#e8c5a8"}`, overflow: "hidden", background: dark ? "#1e1e30" : "#fdf6f0" }}>
            {[{ mode: "auto", icon: "📅" }, { mode: "libre", icon: "✏️" }, { mode: "resume", icon: "📋" }].map(({ mode, icon }, i) => (
              <button key={mode} onClick={() => setViewModeAndSave(mode)}
                style={{ padding: "7px 11px", border: "none", borderLeft: i > 0 ? `1px solid ${dark ? "#3a3a5e" : "#e8c5a8"}` : "none", background: viewMode === mode ? (dark ? "rgba(244,143,177,0.25)" : "rgba(232,144,106,0.18)") : "transparent", color: viewMode === mode ? (dark ? "#f48fb1" : "#e8906a") : textSecondary, fontWeight: viewMode === mode ? "bold" : "normal", fontSize: 14, cursor: "pointer", transition: "background 0.15s" }}>
                {icon}
              </button>
            ))}
          </div>
          <button onClick={() => setShowStats(v => !v)} style={{ padding: "7px 12px", borderRadius: 20, border: `1.5px solid ${showStats ? (dark ? "#90caf9" : "#1565c0") : borderColor}`, background: showStats ? (dark ? "rgba(144,202,249,0.15)" : "rgba(21,101,192,0.08)") : "transparent", color: showStats ? (dark ? "#90caf9" : "#1565c0") : textSecondary, fontWeight: "bold", fontSize: 12, cursor: "pointer" }}>
            📊{showStats ? " ✓" : ""}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setCoucheForm({ date: todayStr(), time: getNow(), pipi: false, caca: false, note: "" }); setShowCoucheForm(true); }}
            style={{ background: dark ? "#2a3a4a" : "#e3f2fd", color: dark ? "#90caf9" : "#1565c0", border: `1.5px solid ${dark ? "#3a5a7a" : "#90caf9"}`, borderRadius: 50, padding: "11px 18px", fontSize: 15, fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            🧷 Couche
          </button>
          <button onClick={() => { setForm({ ...initialForm, date: todayStr(), time: getNow() }); setShowForm(true); setEditId(null); }}
            style={{ background: "linear-gradient(135deg,#e8906a,#e06b8a)", color: "white", border: "none", borderRadius: 50, padding: "11px 22px", fontSize: 15, fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 16px rgba(232,144,106,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>+</span> Boire
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div style={{ padding: "10px 16px 0", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: dark ? "#2a2a3e" : "#fff8f0", borderRadius: 14, padding: "8px 12px", border: `1px solid ${dark ? "#3a3a5e" : "#f0d5c0"}` }}>
          <button onClick={prevMonth} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: dark ? "#3a3a5e" : "#f5c6a0", color: textPrimary, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>‹</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              style={{ background: "transparent", border: "none", fontSize: 14, fontWeight: "bold", color: textPrimary, cursor: "pointer", textAlign: "center", fontFamily: "Georgia,serif", outline: "none", width: "100%" }}>
              {([...new Set([selectedMonth, ...allMonths])]).sort((a, b) => b.localeCompare(a)).map(ym => (
                <option key={ym} value={ym} style={{ background: dark ? "#2a2a3e" : "white" }}>{monthLabel(ym)}</option>
              ))}
            </select>
          </div>
          <button onClick={nextMonth} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: dark ? "#3a3a5e" : "#f5c6a0", color: textPrimary, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>›</button>
        </div>
      </div>

      {/* Stats panel */}
      {showStats && (
        <div style={{ padding: "12px 16px 0", maxWidth: 480, margin: "0 auto" }}>
          <div style={{ background: cardBg, borderRadius: 14, padding: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            {(() => {
              const monthEntries = feedings.filter(f => f.date.startsWith(selectedMonth));
              const monthBoires = monthEntries.filter(f => f._type !== "couche");
              const monthDays = [...new Set(monthEntries.map(f => f.date))].length;
              const allBoires = feedings.filter(f => f._type !== "couche");
              const allDays = [...new Set(feedings.map(f => f.date))].length;
              function calc(boires, allE, days) {
                const total = boires.filter(f => !f.horsSequenceNbBoire).length;
                const avg = days > 0 ? (total / days).toFixed(1) : 0;
                const pipi = allE.filter(f => f.pipi).length;
                const caca = allE.filter(f => f.caca).length;
                const avgPipi = days > 0 ? (pipi / days).toFixed(1) : 0;
                const avgCaca = days > 0 ? (caca / days).toFixed(1) : 0;
                const cMat = boires.reduce((s, f) => s + (parseFloat(f.complMaternel) || 0) + ((f.complementType === "maternel") ? (parseFloat(f.complement) || 0) : 0), 0);
                const cComm = boires.reduce((s, f) => s + (parseFloat(f.complCommercial) || 0) + ((f.complementType === "commercial") ? (parseFloat(f.complement) || 0) : 0), 0);
                const cTotal = cMat + cComm;
                const avgMat = days > 0 ? (cMat / days).toFixed(0) : 0;
                const avgComm = days > 0 ? (cComm / days).toFixed(0) : 0;
                const avgTotal = days > 0 ? (cTotal / days).toFixed(0) : 0;
                const regurgi = boires.reduce((s, f) => s + (parseInt(f.regurgi) || 0), 0);
                const avgRegurgi = days > 0 ? (regurgi / days).toFixed(1) : 0;
                return { total, avg, pipi, caca, avgPipi, avgCaca, cMat, cComm, cTotal, avgMat, avgComm, avgTotal, regurgi, avgRegurgi };
              }
              const ms = calc(monthBoires, monthEntries, monthDays);
              const as = calc(allBoires, feedings, allDays);
              const Row = ({ s, accent, label }) => (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: "bold", color: accent, marginBottom: 6 }}>{label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ background: dark ? "#3a2a10" : "#fdebd0", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: textPrimary, fontWeight: "bold" }}>🍼 {s.total} · {s.avg}/j</span>
                    <span style={{ background: dark ? "#1a3050" : "#ddeeff", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#90caf9" : "#1565c0", fontWeight: "bold" }}>💧 {s.pipi} · {s.avgPipi}/j</span>
                    <span style={{ background: dark ? "#3a2a10" : "#fdebd0", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#ffcc80" : "#e65100", fontWeight: "bold" }}>💩 {s.caca} · {s.avgCaca}/j</span>
                    {s.cMat > 0 && <span style={{ background: dark ? "#3a1a2a" : "#f9c6d8", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#f48fb1" : "#c2185b", fontWeight: "bold" }}>🤱 {s.cMat.toFixed(0)}ml · {s.avgMat}ml/j</span>}
                    {s.cComm > 0 && <span style={{ background: dark ? "#1a2a3a" : "#e3f2fd", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#90caf9" : "#1565c0", fontWeight: "bold" }}>🏭 {s.cComm.toFixed(0)}ml · {s.avgComm}ml/j</span>}
                    {s.cTotal > 0 && <span style={{ background: dark ? "#2a2a2a" : "#f5f5f5", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: textSecondary, fontWeight: "bold" }}>🥛 {s.cTotal.toFixed(0)}ml total · {s.avgTotal}ml/j</span>}
                    {s.regurgi > 0 && <span style={{ background: dark ? "#2a2a10" : "#fffde7", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#ffe082" : "#f57f17", fontWeight: "bold" }}>🤮 {s.regurgi} · {s.avgRegurgi}/j</span>}
                  </div>
                </div>
              );
              return (
                <div>
                  <Row s={ms} accent={dark ? "#f48fb1" : "#e06b8a"} label={`📅 ${monthLabel(selectedMonth)}`} />
                  <div style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, marginBottom: 10 }} />
                  <Row s={as} accent={textSecondary} label="📊 Depuis le début" />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Journal graph */}
      <div style={{ padding: "0 16px", maxWidth: 480, margin: "0 auto 8px" }}>
        <div style={{ background: cardBg, borderRadius: 14, padding: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", borderRadius: 20, border: `1.5px solid ${dark ? "#3a3a5e" : "#e8c5a8"}`, overflow: "hidden" }}>
              {[["mois", "📆 Mois"], ["jour", "📅 Jour"], ["annee", "📊 " + jYear]].map(([m, l], i) => (
                <button key={m} onClick={() => setJournalGraphMode(m)} style={{ padding: "5px 10px", border: "none", borderLeft: i > 0 ? `1px solid ${dark ? "#3a3a5e" : "#e8c5a8"}` : "none", background: journalGraphMode === m ? (dark ? "rgba(232,144,106,0.25)" : "rgba(232,144,106,0.15)") : "transparent", color: journalGraphMode === m ? (dark ? "#f48fb1" : "#e8906a") : textSecondary, fontWeight: journalGraphMode === m ? "bold" : "normal", fontSize: 12, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
            {journalGraphMode === "jour" && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                <button onClick={() => { const idx = jDaysWithData.indexOf(jValidDay); if (idx > 0) setJournalGraphDay(jDaysWithData[idx - 1]); }} disabled={jDaysWithData.indexOf(jValidDay) <= 0} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${dark ? "#444" : "#ddd"}`, background: "transparent", color: textPrimary, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: jDaysWithData.indexOf(jValidDay) <= 0 ? 0.3 : 1 }}>‹</button>
                <select value={jValidDay} onChange={e => setJournalGraphDay(e.target.value)} style={{ flex: 1, padding: "4px 6px", borderRadius: 10, border: `1px solid ${dark ? "#444" : "#ddd"}`, background: dark ? "#1e1e30" : "white", color: textPrimary, fontSize: 11, fontFamily: "Georgia,serif", outline: "none", textAlign: "center" }}>
                  {jDaysWithData.map(d => <option key={d} value={d}>{formatDate(d)}</option>)}
                  {!jDaysWithData.length && <option value={selectedMonth + "-01"}>Aucune donnée</option>}
                </select>
                <button onClick={() => { const idx = jDaysWithData.indexOf(jValidDay); if (idx < jDaysWithData.length - 1) setJournalGraphDay(jDaysWithData[idx + 1]); }} disabled={jDaysWithData.indexOf(jValidDay) >= jDaysWithData.length - 1} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${dark ? "#444" : "#ddd"}`, background: "transparent", color: textPrimary, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: jDaysWithData.indexOf(jValidDay) >= jDaysWithData.length - 1 ? 0.3 : 1 }}>›</button>
              </div>
            )}
          </div>

          {jData.length > 0 ? (
            <svg width={W2} height={journalGraphMode === "mois" || journalGraphMode === "annee" ? H2 + 20 : H2} style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
              {(() => {
                const rotL = journalGraphMode === "mois" || journalGraphMode === "annee";
                const pB2eff = rotL ? 48 : pB;
                const gH2eff = H2 - pT - pB2eff;
                const pY2 = v => pT + gH2eff - (v / jMax) * gH2eff;
                return (<>
                  {[0, Math.round(jMax / 2), Math.round(jMax)].map((v, i) => (
                    <g key={i}>
                      <line x1={pL} y1={pY2(v)} x2={W2 - pR} y2={pY2(v)} stroke={gridC} strokeWidth={1} />
                      <text x={pL - 4} y={pY2(v) + 4} textAnchor="end" fontSize={9} fill={tCol}>{v >= 1000 ? (v / 1000).toFixed(1) + "L" : v}</text>
                    </g>
                  ))}
                  <text x={pL - 2} y={pT - 2} fontSize={9} fill={tCol}>ml</text>
                  {jData.map((d, i) => {
                    const x = bX(i, jData.length), w = bW(jData.length);
                    const h = Math.max(1, gH2eff - (pY2(d.val) - pT));
                    const hasMat = d.mat > 0, hasComm = d.comm > 0;
                    const matH = d.val > 0 ? Math.round(h * (d.mat / d.val)) : 0;
                    const commH = h - matH;
                    const topColor = hasMat ? colorMat : hasComm ? colorComm : colorSolo;
                    const fmtVal2 = v => v >= 1000 ? (v / 1000).toFixed(2) + "L" : v + "";
                    const labelY = pT + gH2eff + 6;
                    return (
                      <g key={i}>
                        {hasMat && hasComm ? (<>
                          <rect x={x} y={pY2(d.val)} width={w} height={matH} fill={colorMat} fillOpacity={0.8} rx={3} />
                          <rect x={x} y={pY2(d.val) + matH} width={w} height={Math.max(1, commH)} fill={colorComm} fillOpacity={0.8} rx={0} />
                        </>) : (
                          <rect x={x} y={pY2(d.val)} width={w} height={h} fill={topColor} fillOpacity={0.8} rx={3} />
                        )}
                        {rotL ? (
                          <text x={x + w / 2} y={labelY} textAnchor="end" fontSize={8} fill={tCol} transform={`rotate(-90,${x + w / 2},${labelY})`}>{d.label}</text>
                        ) : (
                          <text x={x + w / 2} y={H2 - 4} textAnchor="middle" fontSize={8} fill={tCol}>{d.label}</text>
                        )}
                        {d.val > 0 && (rotL ? (() => {
                          const cx2 = x + w / 2;
                          const topY2 = pY2(d.val) - 10;
                          return <text transform={`translate(${cx2},${topY2}) rotate(-90)`} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill={dark ? "#f48fb1" : "#c2185b"} fontWeight="bold">{fmtVal2(Math.round(d.val))}</text>;
                        })() : (
                          <text x={x + w / 2} y={pY2(d.val) - 4} textAnchor="middle" fontSize={8} fill={dark ? "#f48fb1" : "#c2185b"} fontWeight="bold">{fmtVal2(Math.round(d.val))}</text>
                        ))}
                      </g>
                    );
                  })}
                </>);
              })()}
            </svg>
          ) : (
            <div style={{ textAlign: "center", color: "#aaa", fontSize: 12, padding: "16px 0" }}>
              {journalGraphMode === "jour" ? "Aucun ml enregistré ce jour" : journalGraphMode === "annee" ? `Aucune donnée pour ${jYear}` : "Aucun ml enregistré ce mois"}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: tCol }}><span style={{ width: 10, height: 10, borderRadius: 2, background: colorMat, display: "inline-block" }} /> Maternel</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: tCol }}><span style={{ width: 10, height: 10, borderRadius: 2, background: colorComm, display: "inline-block" }} /> Commercial</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: tCol }}><span style={{ width: 10, height: 10, borderRadius: 2, background: colorSolo, display: "inline-block" }} /> Sein seul</div>
          </div>
        </div>
      </div>

      {/* Day list */}
      <div style={{ padding: "14px 16px 0", maxWidth: 480, margin: "0 auto" }}>
        {sortedDates.length === 0 && (
          <div style={{ textAlign: "center", color: "#c9a07a", marginTop: 60, fontSize: 15 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
            Aucun boire en {monthLabel(selectedMonth)}.<br />
            <span style={{ fontSize: 13 }}>Change de mois ou ajoute un boire.</span>
          </div>
        )}
        {sortedDates.map((date, index) => {
          const isCollapsed = isDayCollapsed(date, index);
          const entries = grouped[date];
          return (
            <div key={date} style={{ marginBottom: 28 }}>
              <div onClick={() => toggleDayCollapse(date, sortedDates)}
                style={{ background: dark ? "linear-gradient(90deg,#3a2a4e,#2a3a4e)" : "linear-gradient(90deg,#f5c6a0,#f9a8c0)", borderRadius: 14, padding: "12px 18px", marginBottom: isCollapsed ? 0 : 10, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 2px", fontSize: 15, color: textPrimary, textTransform: "capitalize", fontWeight: "bold" }}>📅 {formatDate(date)}</h2>
                  <DaySummary entries={entries} dark={dark} />
                </div>
                <div style={{ marginLeft: 10, marginTop: 2, fontSize: 18, color: textPrimary, opacity: 0.6, flexShrink: 0 }}>
                  {isCollapsed ? "▶" : "▼"}
                </div>
              </div>
              {!isCollapsed && entries.sort((a, b) => b.time.localeCompare(a.time)).map(f => (
                f._type === "couche"
                  ? <CoucheCard key={f.id} f={f} onEdit={() => handleEditCouche(f)} onDelete={() => handleDelete(f.id)} dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} />
                  : <FeedingCard key={f.id} f={f} onEdit={() => handleEdit(f)} onDelete={() => handleDelete(f.id)} dark={dark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
