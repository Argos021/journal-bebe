import { useState, useEffect } from "react";
import { formatDuration, getNextFeedingTime } from "../helpers.js";

// ── Small reusable UI components ─────────────────────────────────────────────

export function SectionCard({ children, dark, cardBg }) {
  return (
    <div style={{ background: cardBg, borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      {children}
    </div>
  );
}

export function Label({ children, dark }) {
  return (
    <div style={{ fontSize: 13, fontWeight: "bold", color: dark ? "#f5c6a0" : "#7a3b1e", marginBottom: 6 }}>
      {children}
    </div>
  );
}

export function Tag({ children, color, dark }) {
  return (
    <span style={{ background: dark ? (color + "33") : color, borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#f5deb3" : "#5a3020", fontWeight: "bold" }}>
      {children}
    </span>
  );
}

export function ToggleBtn({ active, onClick, label, color, fullWidth, dark }) {
  return (
    <button onClick={onClick} style={{
      flex: fullWidth ? "unset" : 1,
      width: fullWidth ? "100%" : undefined,
      padding: "10px 0",
      borderRadius: 10,
      border: "2px solid",
      borderColor: active ? (color || "#e8906a") : (dark ? "#3a3a5e" : "#ddd"),
      background: active ? (color ? (dark ? color + "44" : color + "55") : (dark ? "#2a1a10" : "#fff0e8")) : (dark ? "#1e1e30" : "#fafafa"),
      color: active ? (dark ? "#f5deb3" : "#5a3020") : (dark ? "#555" : "#aaa"),
      fontWeight: "bold",
      fontSize: 14,
      cursor: "pointer",
      transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

export function ActionBtn({ onClick, label, danger }) {
  return (
    <button onClick={onClick} style={{
      background: danger ? "#fff0f0" : "#f0f8ff",
      border: "none",
      borderRadius: 8,
      width: 32,
      height: 32,
      fontSize: 15,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {label}
    </button>
  );
}

export function btnOptionStyle(dark) {
  return {
    width: "100%",
    padding: "11px 0",
    borderRadius: 10,
    border: "2px solid",
    background: dark ? "#1e1e30" : "#fafafa",
    fontWeight: "bold",
    fontSize: 14,
    cursor: "pointer",
  };
}

// ── DaySummary ────────────────────────────────────────────────────────────────

export function DaySummary({ entries, dark }) {
  const boires = entries.filter(e => e._type !== "couche");
  const nbBoires = boires.filter(e => !e.horsSequenceNbBoire).length;
  const nbPipi = entries.filter(e => e.pipi).length;
  const nbCaca = entries.filter(e => e.caca).length;
  const nbNombril = boires.filter(e => e.nombril).length;
  const nbYeux = boires.filter(e => e.yeux).length;
  const vitamineD = boires.some(e => e.vitamineD);
  const complMaternelle = parseFloat(boires.reduce((s, e) => {
    const legacy = (e.complementType === "maternel") ? (parseFloat(e.complement) || 0) : 0;
    return s + (parseFloat(e.complMaternel) || 0) + legacy;
  }, 0).toFixed(2));
  const complCommercial = parseFloat(boires.reduce((s, e) => {
    const legacy = (e.complementType === "commercial") ? (parseFloat(e.complement) || 0) : 0;
    return s + (parseFloat(e.complCommercial) || 0) + legacy;
  }, 0).toFixed(2));
  const nbRegurgi = boires.reduce((s, e) => s + (parseInt(e.regurgi) || 0), 0);
  const totalMl = complMaternelle + complCommercial;
  const totalMatBu = parseFloat(boires.reduce((s, e) => s + (parseFloat(e.complMaternelBu) || 0), 0).toFixed(2));
  const totalCommBu = parseFloat(boires.reduce((s, e) => s + (parseFloat(e.complCommercialBu) || 0), 0).toFixed(2));
  const totalBu = totalMatBu + totalCommBu;
  const items = [
    { icon: "🍼", label: "Boire" + (nbBoires > 1 ? "s" : ""), val: nbBoires, color: dark ? "#4a3020" : "#fdebd0", show: true },
    { icon: "💧", label: "Pipi", val: nbPipi, color: dark ? "#1a3050" : "#ddeeff", show: nbPipi > 0 },
    { icon: "💩", label: "Caca", val: nbCaca, color: dark ? "#3a2a10" : "#fdebd0", show: nbCaca > 0 },
    { icon: "🤮", label: "Regurgi", val: nbRegurgi, color: dark ? "#2a2a10" : "#fffde7", show: nbRegurgi > 0 },
    { icon: "🫧", label: "Nombril", val: nbNombril, color: dark ? "#1a3020" : "#e8f5e9", show: nbNombril > 0 },
    { icon: "👁️", label: "Yeux", val: nbYeux, color: dark ? "#2a1a3a" : "#f3e5f5", show: nbYeux > 0 },
    { icon: "🤱", label: "ml mat.", val: complMaternelle > 0 ? complMaternelle : null, color: dark ? "#3a1a2a" : "#f9c6d8", show: complMaternelle > 0 },
    { icon: "🏭", label: "ml comm.", val: complCommercial > 0 ? complCommercial : null, color: dark ? "#1a2a3a" : "#e3f2fd", show: complCommercial > 0 },
    { icon: "🥛", label: "ml offert", val: totalMl > 0 ? totalMl.toFixed(0) : null, color: dark ? "#2a2a2a" : "#f5f5f5", show: totalMl > 0 },
    { icon: "🤱", label: "ml mat. bu", val: totalMatBu > 0 ? totalMatBu.toFixed(0) : null, color: dark ? "#1a2a1a" : "#c8e6c9", show: totalMatBu > 0 },
    { icon: "🏭", label: "ml comm. bu", val: totalCommBu > 0 ? totalCommBu.toFixed(0) : null, color: dark ? "#1a2030" : "#bbdefb", show: totalCommBu > 0 },
    { icon: "🍼", label: "ml bu total", val: totalBu > 0 ? totalBu.toFixed(0) : null, color: dark ? "#1a3020" : "#c8e6c9", show: totalBu > 0 },
    { icon: "♻️", label: "ml gaspillé", val: (totalMl > 0 && totalBu > 0) ? Math.max(0, totalMl - totalBu).toFixed(0) : null, color: dark ? "#2a1a00" : "#fff3e0", show: totalMl > 0 && totalBu > 0 && totalMl > totalBu },
  ];
  return (
    <div style={{ background: dark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.7)", borderRadius: 12, padding: "10px 14px", marginTop: 8, marginBottom: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {items.filter(i => i.show).map(i => (
          <span key={i.label} style={{ background: i.color, borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#f5c6a0" : "#5a3020", fontWeight: "bold", display: "flex", alignItems: "center", gap: 4 }}>
            {i.icon} {i.val !== null ? `${i.val} ` : ""}{i.label}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: "bold", color: vitamineD ? (dark ? "#f48fb1" : "#e06b8a") : (dark ? "#555" : "#bbb") }}>
        {vitamineD ? "✅ Vitamine D donnée" : "⬜ Vitamine D non encore indiquée"}
      </div>
    </div>
  );
}

// ── NextFeedingProgress ───────────────────────────────────────────────────────

export function NextFeedingProgress({ lastFeeding, dark, textPrimary, textSecondary }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!lastFeeding) return (
    <div style={{ textAlign: "center", color: "#aaa", padding: "20px 0", fontSize: 13 }}>
      Aucun boire enregistré.
    </div>
  );

  const [y, mo, d] = lastFeeding.date.split("-").map(Number);
  const [h, mi] = lastFeeding.time.split(":").map(Number);
  const lastDt = new Date(y, mo - 1, d, h, mi, 0);
  const totalMins = (parseInt(lastFeeding.durationH) || 0) * 60 + (parseInt(lastFeeding.durationM) || 0);

  const elapsedMs = now - lastDt;
  const elapsedMin = Math.max(0, Math.floor(elapsedMs / 60000));
  const elapsedH = Math.floor(elapsedMin / 60);
  const elapsedM = elapsedMin % 60;

  const intervalMin = totalMins > 0 ? totalMins : 120;
  const progress = Math.min(1, elapsedMin / intervalMin);
  const remaining = Math.max(0, intervalMin - elapsedMin);
  const remH = Math.floor(remaining / 60);
  const remM = remaining % 60;
  const isOverdue = elapsedMin > intervalMin;

  const pct = progress;
  const barColor = pct < 0.6 ? "#4caf50" : pct < 0.85 ? "#ff9800" : "#e53935";
  const bgColor = dark
    ? (pct < 0.6 ? "#1a3020" : pct < 0.85 ? "#3a2a10" : "#3a1010")
    : (pct < 0.6 ? "#e8f5e9" : pct < 0.85 ? "#fff8e1" : "#ffebee");

  return (
    <div style={{ background: bgColor, borderRadius: 12, padding: "14px 16px", transition: "background 0.5s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: textSecondary, marginBottom: 2 }}>Dernier boire</div>
          <div style={{ fontSize: 16, fontWeight: "bold", color: textPrimary }}>
            {lastFeeding.time} · il y a {elapsedH > 0 ? `${elapsedH}h ` : ""}{elapsedM}min
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {isOverdue ? (
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#e53935" }}>⚠️ En retard</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: textSecondary, marginBottom: 2 }}>Prochain boire</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: barColor }}>
                dans {remH > 0 ? `${remH}h ` : ""}{remM}min
              </div>
            </>
          )}
        </div>
      </div>
      <div style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", borderRadius: 20, height: 14, overflow: "hidden", marginBottom: 8 }}>
        <div style={{
          height: "100%",
          width: `${Math.min(100, progress * 100)}%`,
          background: `linear-gradient(90deg, #4caf50, ${barColor})`,
          borderRadius: 20,
          transition: "width 0.5s ease, background 0.5s ease",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.25) 50%,transparent 100%)",
            animation: "shimmer 2s infinite",
          }} />
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: textSecondary }}>
        <span>🍼 {lastFeeding.time}</span>
        <span>{Math.round(progress * 100)}%</span>
        {totalMins > 0 && <span>⏰ {formatDuration(intervalMin)}</span>}
      </div>
      {!isOverdue && totalMins > 0 && (
        <div style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: barColor, fontWeight: "bold" }}>
          ➜ Prochain boire vers {getNextFeedingTime(lastFeeding.time, intervalMin)}
        </div>
      )}
      {totalMins === 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: textSecondary, textAlign: "center", fontStyle: "italic" }}>
          Durée du dernier boire non renseignée — intervalle estimé à 2h
        </div>
      )}
    </div>
  );
}
