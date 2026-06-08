import { useState, useEffect } from "react";
import { todayStr } from "../helpers.js";
import { btnPrimaryBase, btnSecondaryBase } from "../constants.js";
import { Label } from "./ui.jsx";

// ── ProfileTab ────────────────────────────────────────────────────────────────

export function ProfileTab({ profile, saveProfile, dark, cardBg, textPrimary, textSecondary, dynInputStyle }) {
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
  const sexeLabel = { fille: "👧 Fille", garcon: "👦 Garçon", autre: "🌸 Autre" }[profile.sexe] || null;
  const alimentLabel = { maternelle: "🤱 Maternelle", commerciale: "🥛 Commerciale", mixte: "🔀 Mixte" }[profile.typeAlimentation] || null;

  // Age calculation
  const ageBlock = profile.dateNaissance ? (() => {
    const timeStr = profile.heureNaissance || "00:00";
    const [y, mo, d] = profile.dateNaissance.split("-").map(Number);
    const [h, mi] = timeStr.split(":").map(Number);
    const birth = new Date(y, mo - 1, d, h, mi);
    const now = new Date();
    const diffMs = now - birth;
    if (diffMs < 0) return null;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffMs / 86400000);
    const semaines = Math.floor(diffDays / 7);
    const jourReste = diffDays % 7;
    const mois = Math.floor(diffDays / 30.44);
    const semainesResteMois = Math.floor((diffDays - mois * 30.44) / 7);
    const ans = Math.floor(diffDays / 365);
    const moisResteAns = Math.floor((diffDays % 365) / 30.44);

    let ageStr = "", subStr = "";
    if (diffDays < 7) {
      ageStr = `${diffDays} jour${diffDays > 1 ? "s" : ""} ${diffHours % 24}h`;
      subStr = `${diffDays} jours ${diffHours % 24}h`;
    } else if (diffDays < 31) {
      ageStr = `${semaines} sem${jourReste > 0 ? ` ${jourReste}j` : ""}`;
      subStr = `${diffDays} jours ${diffHours % 24}h`;
    } else if (mois < 12) {
      ageStr = `${mois} mois${semainesResteMois > 0 ? ` ${semainesResteMois} sem` : ""}`;
      subStr = `${semaines} sem${jourReste > 0 ? ` ${jourReste}j` : ""}`;
    } else {
      ageStr = `${ans} an${ans > 1 ? "s" : ""}${moisResteAns > 0 ? ` ${moisResteAns} mois` : ""}`;
      subStr = `${mois} mois${semainesResteMois > 0 ? ` ${semainesResteMois} sem` : ""}`;
    }
    return { ageStr, subStr, diffDays, diffHours };
  })() : null;

  const rowStyle = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    paddingBottom: 10, marginBottom: 10,
    borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
  };
  const labelStyle = { fontSize: 12, color: textSecondary, fontWeight: "bold" };
  const valueStyle = { fontSize: 14, color: textPrimary, fontWeight: "bold", textAlign: "right" };
  const emptyStyle = { fontSize: 13, color: dark ? "#444" : "#ccc", fontStyle: "italic", textAlign: "right" };

  return (
    <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: textPrimary }}>👶 Profil de bébé</h2>
        {!editing && (
          <button onClick={() => { setDraft(profile); setEditing(true); }}
            style={{ padding: "8px 18px", borderRadius: 20, border: `1.5px solid ${dark ? "#5a3a6e" : "#e8c5a8"}`, background: "transparent", color: textPrimary, fontWeight: "bold", fontSize: 13, cursor: "pointer" }}>
            ✏️ Modifier
          </button>
        )}
      </div>

      {/* ── READ-ONLY VIEW ── */}
      {!editing && (
        <>
          {ageBlock && (
            <div style={{ background: dark ? "#1a2a3a" : "#e3f2fd", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: "bold", color: dark ? "#90caf9" : "#1565c0" }}>🎉 {ageBlock.ageStr}</div>
                <div style={{ fontSize: 11, color: "#5a8aaa" }}>
                  {ageBlock.subStr} · né à {profile.heureNaissance || "—"}
                </div>
              </div>
              {profile.sexe && <div style={{ fontSize: 30 }}>{profile.sexe === "fille" ? "👧" : profile.sexe === "garcon" ? "👦" : "🌸"}</div>}
            </div>
          )}

          <div style={{ background: cardBg, borderRadius: 16, padding: "16px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 14 }}>
            <div style={rowStyle}>
              <span style={labelStyle}>👶 Prénom</span>
              <span style={has(profile.nom) ? valueStyle : emptyStyle}>{profile.nom || "Non renseigné"}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>🎂 Date de naissance</span>
              <span style={has(profile.dateNaissance) ? valueStyle : emptyStyle}>{profile.dateNaissance || "Non renseignée"}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>⚥ Sexe</span>
              <span style={has(sexeLabel) ? valueStyle : emptyStyle}>{sexeLabel || "Non renseigné"}</span>
            </div>
            <div style={{ ...rowStyle, borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
              <span style={labelStyle}>🍼 Alimentation</span>
              <span style={has(alimentLabel) ? valueStyle : emptyStyle}>{alimentLabel || "Non renseignée"}</span>
            </div>
          </div>

          <div style={{ background: cardBg, borderRadius: 16, padding: "16px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: "bold", color: textSecondary, marginBottom: 10 }}>📏 Mesures à la naissance</div>
            {[
              ["⚖️ Poids", profile.poidsNaissance, "g"],
              ["📏 Taille", profile.tailleNaissance, "cm"],
              ["🔵 Crâne", profile.perimCranien, "cm"],
            ].map(([label, val, unit], i, arr) => (
              <div key={label} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? rowStyle.borderBottom : "none", marginBottom: i < arr.length - 1 ? rowStyle.marginBottom : 0, paddingBottom: i < arr.length - 1 ? rowStyle.paddingBottom : 0 }}>
                <span style={labelStyle}>{label}</span>
                <span style={has(val) ? valueStyle : emptyStyle}>{val ? `${val} ${unit}` : "Non renseigné"}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", fontSize: 12, color: dark ? "#444" : "#ccc" }}>
            Appuie sur ✏️ Modifier pour changer les informations
          </div>
        </>
      )}

      {/* ── EDIT MODE ── */}
      {editing && (
        <>
          <div style={{ background: cardBg, borderRadius: 16, padding: "16px", marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <Label dark={dark}>👶 Prénom</Label>
            <input value={draft.nom || ""} onChange={e => setDraft(d => ({ ...d, nom: e.target.value }))} placeholder="Prénom de bébé" style={dynInputStyle} />

            <Label dark={dark}>🎂 Date de naissance</Label>
            <input type="date" value={draft.dateNaissance || ""} max={todayStr()} onChange={e => setDraft(d => ({ ...d, dateNaissance: e.target.value }))} style={dynInputStyle} />

            <Label dark={dark}>🕐 Heure de naissance</Label>
            <input type="time" value={draft.heureNaissance || ""} onChange={e => setDraft(d => ({ ...d, heureNaissance: e.target.value }))} style={dynInputStyle} />

            <Label dark={dark}>⚥ Sexe</Label>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[["fille", "👧 Fille"], ["garcon", "👦 Garçon"], ["autre", "🌸 Autre"]].map(([val, label]) => (
                <button key={val} onClick={() => setDraft(d => ({ ...d, sexe: val }))}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "2px solid", borderColor: draft.sexe === val ? "#e06b8a" : "#ddd", background: draft.sexe === val ? (dark ? "rgba(224,107,138,0.2)" : "#fce4ec") : (dark ? "#1e1e30" : "#fafafa"), color: draft.sexe === val ? "#c2185b" : (dark ? "#555" : "#aaa"), fontWeight: "bold", fontSize: 13, cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>

            <Label dark={dark}>🍼 Type d'alimentation</Label>
            <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
              {[["maternelle", "🤱 Maternelle"], ["commerciale", "🥛 Commerciale"], ["mixte", "🔀 Mixte"]].map(([val, label]) => (
                <button key={val} onClick={() => setDraft(d => ({ ...d, typeAlimentation: val }))}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "2px solid", borderColor: draft.typeAlimentation === val ? "#e8906a" : "#ddd", background: draft.typeAlimentation === val ? (dark ? "rgba(232,144,106,0.2)" : "#fff0e8") : (dark ? "#1e1e30" : "#fafafa"), color: draft.typeAlimentation === val ? "#b05a30" : (dark ? "#555" : "#aaa"), fontWeight: "bold", fontSize: 12, cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: cardBg, borderRadius: 16, padding: "16px", marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: textPrimary, marginBottom: 12 }}>📏 Mesures à la naissance</div>
            <Label dark={dark}>⚖️ Poids de naissance (grammes)</Label>
            <input type="number" min="0" placeholder="ex: 3400" value={draft.poidsNaissance || ""} onChange={e => setDraft(d => ({ ...d, poidsNaissance: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>📏 Taille à la naissance (cm)</Label>
            <input type="number" min="0" step="0.1" placeholder="ex: 50.0" value={draft.tailleNaissance || ""} onChange={e => setDraft(d => ({ ...d, tailleNaissance: e.target.value }))} style={dynInputStyle} />
            <Label dark={dark}>🔵 Périmètre crânien à la naissance (cm)</Label>
            <input type="number" min="0" step="0.1" placeholder="ex: 34.5" value={draft.perimCranien || ""} onChange={e => setDraft(d => ({ ...d, perimCranien: e.target.value }))} style={dynInputStyle} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={handleCancel} style={{ ...btnSecondaryBase, flex: 1 }}>Annuler</button>
            <button onClick={handleSave} style={{ ...btnPrimaryBase, flex: 2 }}>✅ Enregistrer</button>
          </div>
        </>
      )}
    </div>
  );
}
