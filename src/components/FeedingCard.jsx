import { formatDuration, getNextFeedingTime } from "../helpers.js";
import { Tag, ActionBtn } from "./ui.jsx";

// ── CoucheCard ────────────────────────────────────────────────────────────────

export function CoucheCard({ f, onEdit, onDelete, dark, cardBg, textPrimary, textSecondary }) {
  return (
    <div style={{ background: dark ? "#1e2a1e" : "#f0faf0", borderRadius: 16, padding: "12px 16px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: "4px solid #78c878", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18, fontWeight: "bold", color: textPrimary }}>{f.time}</span>
          <span style={{ fontSize: 12, background: dark ? "#1a3020" : "#e8f5e9", borderRadius: 20, padding: "2px 10px", color: dark ? "#a5d6a7" : "#2e7d32", fontWeight: "bold" }}>🧷 Couche</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {f.pipi && <span style={{ background: dark ? "#1a3050" : "#ddeeff", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#90caf9" : "#1565c0", fontWeight: "bold" }}>💧 Pipi</span>}
          {f.caca && <span style={{ background: dark ? "#3a2a10" : "#fdebd0", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: dark ? "#ffcc80" : "#e65100", fontWeight: "bold" }}>💩 Caca</span>}
        </div>
        {f.note && <div style={{ marginTop: 6, fontSize: 12, color: "#8a6a5a", fontStyle: "italic" }}>"{f.note}"</div>}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ background: dark ? "#1a3020" : "#f0faf0", border: `1px solid ${dark ? "#2a4a2a" : "#c8e6c9"}`, borderRadius: 8, width: 32, height: 32, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
        <button onClick={onDelete} style={{ background: "#fff0f0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🗑️</button>
      </div>
    </div>
  );
}

// ── FeedingCard ───────────────────────────────────────────────────────────────

export function FeedingCard({ f, onEdit, onDelete, dark, cardBg, textPrimary, textSecondary }) {
  const dH = (parseInt(f.durationH) || 0), dM = (parseInt(f.durationM) || 0);
  const totalMins = dH * 60 + dM || (parseInt(f.duration) || 0);
  const next = getNextFeedingTime(f.time, totalMins || null);
  const durationLabel = formatDuration(totalMins);

  let seinTag = null;
  if (f.seinPremier) {
    const s2 = f.seinPremier === "gauche" ? "droite" : "gauche";
    seinTag = <Tag color="#f9c6d8" dark={dark}>🤱 {f.seinPremier} → {s2}</Tag>;
  } else if (f.seinGauche || f.seinDroit) {
    seinTag = <Tag color="#f9c6d8" dark={dark}>🤱 {f.seinGauche ? "Gauche" : "Droite"}</Tag>;
  }

  return (
    <div style={{ background: cardBg, borderRadius: 16, padding: "16px", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderLeft: "4px solid #e8906a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: "bold", color: textPrimary }}>{f.time}</span>
          {durationLabel && <span style={{ fontSize: 12, color: textSecondary, marginLeft: 8, background: dark ? "#3a2a10" : "#fef0e6", borderRadius: 20, padding: "2px 10px" }}>{durationLabel}</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ActionBtn onClick={onEdit} label="✏️" />
          <ActionBtn onClick={onDelete} label="🗑️" danger />
        </div>
      </div>
      {next && <div style={{ fontSize: 12, color: "#e06b8a", marginBottom: 8, fontWeight: "bold" }}>⏰ Prochain boire vers {next}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: f.note ? 10 : 0 }}>
        {seinTag}
        {(parseFloat(f.complMaternel) || 0) > 0 && <Tag color="#f9c6d8" dark={dark}>🤱 {f.complMaternel} ml mat.</Tag>}
        {(parseFloat(f.complCommercial) || 0) > 0 && <Tag color="#d6eeff" dark={dark}>🏭 {f.complCommercial} ml comm.</Tag>}
        {/* Legacy fallback */}
        {!f.complMaternel && !f.complCommercial && f.complement && <Tag color={f.complementType === "maternel" ? "#f9c6d8" : "#d6eeff"} dark={dark}>{f.complementType === "maternel" ? "🤱" : "🥛"} {f.complement} ml</Tag>}
        {f.pipi && <Tag color="#ddeeff" dark={dark}>💧 Pipi</Tag>}
        {f.caca && <Tag color="#fdebd0" dark={dark}>💩 Caca</Tag>}
        {f.vitamineD && <Tag color="#fff9c4" dark={dark}>☀️ Vit. D</Tag>}
        {f.nombril && <Tag color="#e8f5e9" dark={dark}>🫧 Nombril</Tag>}
        {f.yeux && <Tag color="#f3e5f5" dark={dark}>👁️ Yeux</Tag>}
        {(parseInt(f.regurgi) || 0) > 0 && <Tag color="#fffde7" dark={dark}>🤮 {f.regurgi} régurgi{parseInt(f.regurgi) > 1 ? "s" : ""}</Tag>}
        {!seinTag && !f.complement && !f.pipi && !f.caca && !f.vitamineD && !f.nombril && !f.yeux && !(parseInt(f.regurgi) || 0) && <span style={{ fontSize: 12, color: "#ccc" }}>Aucun détail</span>}
      </div>
      {f.note && <div style={{ marginTop: 6, fontSize: 13, color: "#8a6a5a", background: dark ? "#1a1a2e" : "#fdf6f0", borderRadius: 8, padding: "8px 10px", borderLeft: "3px solid #f5c6a0", fontStyle: "italic" }}>"{f.note}"</div>}
    </div>
  );
}
