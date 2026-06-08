import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "../firebase.js";
import { doc, deleteDoc } from "firebase/firestore";
import { whoInterpolate, getWhoTable } from "../constants.js";
import { formatDateShort } from "../helpers.js";

// ── GrowthLineChart ───────────────────────────────────────────────────────────

function GrowthLineChart({ data, valueKey, color, unit, dark, whoTable, birthDate, showWho, birthPoidsG, birthHeureNaissance, weightUnit }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(1);
  const viewRef = useRef({ s: 0, e: 1 });
  useEffect(() => { viewRef.current = { s: viewStart, e: viewEnd }; }, [viewStart, viewEnd]);

  const lastDist = useRef(null);
  const lastMidX = useRef(null);
  const lastPanX = useRef(null);
  const touchMode = useRef(null);

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function applyViewport(newStart, newEnd) {
    const s = clamp(newStart, 0, 1);
    const e = clamp(newEnd, s + 0.02, 1);
    setViewStart(s); setViewEnd(e);
    viewRef.current = { s, e };
  }

  function resetZoom() { applyViewport(0, 1); }
  const isZoomed = viewStart > 0.005 || viewEnd < 0.995;
  const zoomLevel = Math.round(1 / (viewEnd - viewStart) * 10) / 10;

  function handleWheel(e) {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const relX = rect ? clamp((e.clientX - rect.left) / rect.width, 0, 1) : 0.5;
    const factor = e.deltaY < 0 ? 1.3 : 0.77;
    const { s, e: ve } = viewRef.current;
    const span = ve - s;
    const newSpan = clamp(span / factor, 0.05, 1);
    const anchor = s + relX * span;
    const newStart = clamp(anchor - relX * newSpan, 0, 1 - newSpan);
    applyViewport(newStart, newStart + newSpan);
  }

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      touchMode.current = 'pinch';
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.sqrt(dx * dx + dy * dy);
      const rect = containerRef.current?.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      lastMidX.current = rect ? (midX - rect.left) / rect.width : 0.5;
    } else if (e.touches.length === 1) {
      touchMode.current = 'pan';
      lastPanX.current = e.touches[0].clientX;
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (touchMode.current === 'pinch' && e.touches.length === 2 && lastDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / lastDist.current;
      lastDist.current = dist;
      const { s, e: ve } = viewRef.current;
      const span = ve - s;
      const center = lastMidX.current ?? 0.5;
      const newSpan = clamp(span / factor, 0.05, 1);
      const newStart = clamp(s + center * (span - newSpan), 0, 1 - newSpan);
      applyViewport(newStart, newStart + newSpan);
    } else if (touchMode.current === 'pan' && e.touches.length === 1 && lastPanX.current !== null) {
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 300;
      const deltaFrac = (lastPanX.current - e.touches[0].clientX) / width;
      lastPanX.current = e.touches[0].clientX;
      const { s, e: ve } = viewRef.current;
      const span = ve - s;
      const newStart = clamp(s + deltaFrac * span, 0, 1 - span);
      applyViewport(newStart, newStart + span);
    }
  }

  function handleTouchEnd() {
    lastDist.current = null; lastMidX.current = null; lastPanX.current = null;
    touchMode.current = null;
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const sorted = [...data].filter(d => d[valueKey]).sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 1) return (
    <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, padding: "20px 0" }}>
      Ajoute au moins 1 mesure pour voir le graphique.
    </div>
  );

  const whoPoints = (showWho && whoTable && birthDate) ? (() => {
    const [by, bmo, bd] = birthDate.split("-").map(Number);
    const birthDt = new Date(by, bmo - 1, bd);
    const ages = sorted.map(d => {
      if (d._isBirth) return 0;
      const [dy, dmo, dd] = d.date.split("-").map(Number);
      return (new Date(dy, dmo - 1, dd) - birthDt) / (1000 * 60 * 60 * 24 * 30.44);
    });
    const minAge = Math.max(0, Math.min(...ages));
    const maxAge = Math.min(24, Math.max(...ages) + 1);
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const age = minAge + (maxAge - minAge) * i / 30;
      const vals = whoInterpolate(whoTable, age);
      if (vals) pts.push({ age, vals });
    }
    return { pts, ages, minAge, maxAge };
  })() : null;

  const vals = sorted.map(d => parseFloat(d[valueKey]));
  let allVals = [...vals];
  if (whoPoints) {
    const factor = unit === "g" ? 1000 : unit === "lb" ? 2.205 : unit === "po" ? (1 / 2.54) : 1;
    whoPoints.pts.forEach(p => allVals.push(p.vals[0] * factor, p.vals[4] * factor));
  }
  const minV = Math.min(...allVals), maxV = Math.max(...allVals);
  const range = maxV - minV || 1;

  const W = 320, H = 170, padL = 44, padR = 12, padT = 16, padB = 28;
  const gW = W - padL - padR, gH = H - padT - padB;

  const useAgeX = !!(whoPoints && birthDate);
  const xMin = useAgeX ? whoPoints.minAge : 0;
  const xMax = useAgeX ? whoPoints.maxAge : Math.max(sorted.length - 1, 1);
  const xSpan = xMax - xMin;
  const vxMin = xMin + viewStart * xSpan;
  const vxMax = xMin + viewEnd * xSpan;
  const vxSpan = vxMax - vxMin;

  const pxVal = x => padL + ((x - vxMin) / vxSpan) * gW;
  const py = v => padT + gH - ((v - minV) / range) * gH;

  const textCol = dark ? "#aaa" : "#888";
  const gridCol = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const yLabels = [minV, minV + range / 2, maxV].map(v => {
    if (unit === "g") return Math.round(v);
    if (unit === "lb") return parseFloat(v).toFixed(2);
    return Math.round(v * 10) / 10;
  });

  const birthVal = sorted.find(d => d._isBirth) ? parseFloat(sorted.find(d => d._isBirth)[valueKey]) : null;

  const WHO_COLORS = [
    { pIdx: 2, color: "#4caf50", dash: "none", opacity: 0.8 },
    { pIdx: 1, color: "#ff9800", dash: "4,3", opacity: 0.6 },
    { pIdx: 3, color: "#ff9800", dash: "4,3", opacity: 0.6 },
    { pIdx: 0, color: "#e53935", dash: "2,3", opacity: 0.5 },
    { pIdx: 4, color: "#e53935", dash: "2,3", opacity: 0.5 },
  ];

  const whoLinePath = pIdx => {
    if (!whoPoints) return "";
    const factor = unit === "g" ? 1000 : unit === "lb" ? 2.205 : unit === "po" ? (1 / 2.54) : 1;
    return whoPoints.pts.map((p, i) => {
      const x = pxVal(p.age), y = py(p.vals[pIdx] * factor);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ");
  };

  const dataPoints = sorted.map((d, i) => {
    const val = parseFloat(d[valueKey]);
    const prevVal = i > 0 ? parseFloat(sorted[i - 1][valueKey]) : null;
    const xVal = useAgeX ? whoPoints.ages[i] : i;
    return { d, i, val, prevVal, cx: pxVal(xVal), xVal };
  });

  const linePoints = dataPoints.map(p => `${p.cx},${py(p.val)}`).join(" ");
  const areaPoints = `${dataPoints[0]?.cx},${padT + gH} ${linePoints} ${dataPoints[dataPoints.length - 1]?.cx},${padT + gH}`;

  const visiblePoints = dataPoints.filter(p => p.cx >= padL - 5 && p.cx <= W - padR + 5);
  const xLabels = (() => {
    const result = [];
    let lastX = -999;
    visiblePoints.forEach(p => {
      if (p.cx - lastX >= 32) {
        let label;
        if (useAgeX && zoomLevel >= 3) {
          label = `${Math.round(p.xVal * 30)}j`;
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
    if (tooltip?.i === i) { setTooltip(null); return; }
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const scaleX = svgRect.width / W, scaleY = svgRect.height / H;
    const cx = dataPoints[i].cx;
    const screenX = svgRect.left + cx * scaleX;
    const screenY = svgRect.top + py(val) * scaleY + window.scrollY;
    let pct = null, exactPct = null;
    if (whoPoints && whoTable) {
      const ref = whoInterpolate(whoTable, dataPoints[i].xVal);
      if (ref) {
        let factor;
        if (unit === "g") factor = 1000;
        else if (unit === "lb") factor = 2.205;
        else factor = 1;
        const isInches = unit === "po";
        const rv = ref.map(v => isInches ? v / 2.54 * 10 : v * factor);
        if (val <= rv[0]) pct = "< P3";
        else if (val <= rv[1]) pct = "P3–P15";
        else if (val <= rv[2]) pct = "P15–P50";
        else if (val <= rv[3]) pct = "P50–P85";
        else if (val <= rv[4]) pct = "P85–P97";
        else pct = "> P97";
        const knownPcts = [3, 15, 50, 85, 97];
        if (val <= rv[0]) exactPct = Math.round(3 * val / rv[0]);
        else if (val >= rv[4]) exactPct = Math.min(99, Math.round(97 + 2 * (val - rv[4]) / (rv[4] - rv[3])));
        else {
          for (let k = 0; k < 4; k++) {
            if (val >= rv[k] && val <= rv[k + 1]) {
              const t = (val - rv[k]) / (rv[k + 1] - rv[k]);
              exactPct = Math.round(knownPcts[k] + t * (knownPcts[k + 1] - knownPcts[k]));
              break;
            }
          }
        }
      }
    }
    setTooltip({ i, d, val, prevVal, screenX, screenY, pct, exactPct });
  }

  return (
    <div style={{ position: "relative" }}>
      {whoPoints && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 6, flexWrap: "wrap" }}>
          {[["P3/P97", "#e53935"], ["P15/P85", "#ff9800"], ["P50", "#4caf50"]].map(([l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: textCol }}>
              <svg width={18} height={8}><line x1={0} y1={4} x2={18} y2={4} stroke={c} strokeWidth={1.5} strokeDasharray={l === "P50" ? "none" : "4,2"} /></svg>{l}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, padding: "0 4px" }}>
        <span style={{ fontSize: 10, color: dark ? "#555" : "#bbb" }}>
          {isZoomed ? `🔍 ${zoomLevel}x · ← un doigt pour déplacer` : "🔍 Pinch / molette pour zoomer"}
        </span>
        {isZoomed && (
          <button onClick={resetZoom} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, border: `1px solid ${dark ? "#444" : "#ddd"}`, background: dark ? "#2a2a3e" : "#f5f5f5", color: dark ? "#aaa" : "#888", cursor: "pointer" }}>
            ↺ Reset
          </button>
        )}
      </div>

      <div ref={containerRef}
        style={{ position: "relative", touchAction: "none", userSelect: "none", cursor: isZoomed ? "grab" : "default" }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <svg ref={svgRef} width={W} height={H} style={{ display: "block", margin: "0 auto", overflow: "hidden" }} onClick={() => setTooltip(null)}>
          <defs>
            <clipPath id="chartClip">
              <rect x={padL} y={0} width={gW} height={H} />
            </clipPath>
          </defs>
          {yLabels.map((v, i) => (
            <g key={i}>
              <line x1={padL} y1={py(v)} x2={W - padR} y2={py(v)} stroke={gridCol} strokeWidth={1} />
              <text x={padL - 4} y={py(v) + 4} textAnchor="end" fontSize={9} fill={textCol}>{v}</text>
            </g>
          ))}
          <text x={padL - 2} y={padT - 4} fontSize={9} fill={textCol}>{unit}</text>
          <g clipPath="url(#chartClip)">
            {whoPoints && WHO_COLORS.map(({ pIdx, color: wc, dash, opacity }) => (
              <path key={pIdx} d={whoLinePath(pIdx)} fill="none" stroke={wc} strokeWidth={pIdx === 2 ? 1.5 : 1} strokeDasharray={dash} opacity={opacity} />
            ))}
            {sorted.length > 1 && <>
              <polygon points={areaPoints} fill={color} fillOpacity={0.15} />
              <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            </>}
            {dataPoints.map(({ d, i, val, prevVal, cx }) => {
              const sel = tooltip?.i === i;
              return (
                <g key={i} onClick={e => handleDotClick(e, d, i, val, prevVal)} style={{ cursor: "pointer" }}>
                  <circle cx={cx} cy={py(val)} r={14} fill="transparent" />
                  <circle cx={cx} cy={py(val)} r={sel ? 6 : 4} fill={sel ? "white" : color} stroke={sel ? color : (dark ? "#1a1a2e" : "white")} strokeWidth={sel ? 3 : 2} />
                </g>
              );
            })}
          </g>
          {xLabels.map(({ i, cx, label }) => (
            <text key={i} x={cx} y={H - 4} textAnchor="middle" fontSize={9} fill={tooltip?.i === i ? color : textCol}>{label}</text>
          ))}
        </svg>
      </div>

      {tooltip && createPortal((() => {
        const { val, prevVal, screenX, screenY, pct, exactPct } = tooltip;
        const diff = prevVal !== null ? (val - prevVal) : null;
        const diffPct = prevVal !== null ? ((val - prevVal) / prevVal * 100) : null;
        const birthPct2 = birthVal && !tooltip.d._isBirth ? ((val - birthVal) / birthVal * 100) : null;
        const label = tooltip.d._label || formatDateShort(tooltip.d.date);
        const bubbleW = 180;
        const left = Math.max(8, Math.min(screenX - bubbleW / 2, window.innerWidth - bubbleW - 8));
        const top = screenY - 16;
        return (
          <div onClick={() => setTooltip(null)} style={{ position: "absolute", top: top + "px", left: left + "px", transform: "translateY(-100%)", background: dark ? "#2a2a3e" : "white", border: `2px solid ${color}`, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: dark ? "#f5deb3" : "#333", boxShadow: "0 4px 24px rgba(0,0,0,0.25)", zIndex: 99999, width: bubbleW + "px", cursor: "pointer" }}>
            <div style={{ fontWeight: "bold", color, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 4 }}>
              {unit === "g" ? Math.round(val) : unit === "lb" ? parseFloat(val).toFixed(2) : parseFloat(val).toFixed(1)} {unit}
            </div>
            {pct && (
              <div style={{ background: dark ? "#1a1a2e" : "#f5f5f5", borderRadius: 8, padding: "5px 10px", marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: dark ? "#aaa" : "#888", marginBottom: 2 }}>📊 Percentile OMS</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  {exactPct !== null && <span style={{ fontSize: 18, fontWeight: "bold", color: exactPct < 15 ? "#e53935" : exactPct < 50 ? "#ff9800" : exactPct < 85 ? "#4caf50" : "#1565c0" }}>{exactPct}e</span>}
                  <span style={{ fontSize: 11, color: dark ? "#888" : "#666" }}>({pct})</span>
                </div>
              </div>
            )}
            {diff !== null && <div style={{ color: diff >= 0 ? "#4caf50" : "#e53935", marginBottom: 2 }}>{diff >= 0 ? "▲" : "▼"} {unit === "g" ? Math.round(Math.abs(diff)) : unit === "lb" ? Math.abs(diff).toFixed(2) : Math.abs(diff).toFixed(1)} {unit} vs précédent</div>}
            {diffPct !== null && <div style={{ color: diff >= 0 ? "#4caf50" : "#e53935", marginBottom: 2 }}>{diffPct >= 0 ? "▲" : "▼"} {Math.abs(diffPct).toFixed(1)}%</div>}
            {birthPct2 !== null && <div style={{ color: birthPct2 >= 0 ? "#1565c0" : "#ff7043", fontSize: 11, marginTop: 4, borderTop: `1px solid ${dark ? "#333" : "#eee"}`, paddingTop: 4 }}>{birthPct2 >= 0 ? "▲" : "▼"} {Math.abs(birthPct2).toFixed(1)}% vs naissance</div>}
            {(() => {
              if (!birthPoidsG || !birthDate || tooltip.d._isBirth) return null;
              const [by, bmo, bd] = birthDate.split("-").map(Number);
              const [bh, bmi] = (birthHeureNaissance || "00:00").split(":").map(Number);
              const birthDt = new Date(by, bmo - 1, bd, bh, bmi);
              const [dy, dmo, dd] = tooltip.d.date.split("-").map(Number);
              const measDt = new Date(dy, dmo - 1, dd, 12, 0);
              const diffDays = (measDt - birthDt) / 86400000;
              if (diffDays <= 0) return null;
              const valG = unit === "lb" ? val * 453.592 : val;
              const diffG = valG - birthPoidsG;
              const gPerDay = (diffG / diffDays).toFixed(1);
              const color2 = parseFloat(gPerDay) >= 0 ? "#4caf50" : "#e53935";
              return <div style={{ color: color2, fontSize: 11, marginTop: 2 }}>{parseFloat(gPerDay) >= 0 ? "▲" : "▼"} {Math.abs(gPerDay)}g/j depuis naissance</div>;
            })()}
          </div>
        );
      })(), document.body)}
    </div>
  );
}

// ── GrowthTab ─────────────────────────────────────────────────────────────────

export function GrowthTab({ growth, setGrowth, setShowGrowthForm, onEdit, profile, dark, cardBg, textPrimary, textSecondary, dynCardStyle, setConfirmDelete }) {
  const [view, setView] = useState("graphique");
  const [metric, setMetric] = useState("poids");
  const [weightUnit, setWeightUnit] = useState("g");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [showWho, setShowWho] = useState(false);

  function toDisplayWeight(grams) {
    if (!grams) return null;
    if (weightUnit === "lb") return (parseFloat(grams) / 453.592).toFixed(2);
    return parseFloat(grams);
  }
  function toDisplayHeight(cm) {
    if (!cm) return null;
    if (heightUnit === "ft") {
      const totalIn = parseFloat(cm) / 2.54;
      const ft = Math.floor(totalIn / 12);
      const inch = (totalIn % 12).toFixed(1);
      return `${ft}' ${inch}"`;
    }
    return parseFloat(cm);
  }
  function weightUnitLabel() { return weightUnit === "lb" ? "lb" : "g"; }
  function heightUnitLabel() { return heightUnit === "ft" ? "pi/po" : "cm"; }

  const birthEntry = (profile?.poidsNaissance || profile?.tailleNaissance || profile?.perimCranien) ? {
    id: "__birth__", date: "0000-00-00",
    poids: profile.poidsNaissance || "", taille: profile.tailleNaissance || "",
    crane: profile.perimCranien || "", _isBirth: true,
  } : null;

  const allGrowth = birthEntry ? [birthEntry, ...growth] : growth;
  const displayGrowth = allGrowth.map(g => ({
    ...g,
    _poidsDisplay: g.poids ? String(weightUnit === "lb" ? (parseFloat(g.poids) / 453.592).toFixed(2) : parseFloat(g.poids)) : "",
    _tailleDisplay: g.taille ? String(heightUnit === "ft" ? (parseFloat(g.taille) / 2.54).toFixed(1) : parseFloat(g.taille)) : "",
    _craneDisplay: g.crane ? String(parseFloat(g.crane).toFixed(1)) : "",
    _label: g._isBirth ? "Naissance" : formatDateShort(g.date),
  }));

  const sorted = [...displayGrowth].sort((a, b) => a.date.localeCompare(b.date));
  const sortedGrowth = [...growth].sort((a, b) => b.date.localeCompare(a.date));

  const latestPoids  = sortedGrowth.find(g => g.poids);
  const latestTaille = sortedGrowth.find(g => g.taille);
  const latestCrane  = sortedGrowth.find(g => g.crane);
  const prevPoids    = sortedGrowth.filter(g => g.poids)[1] || null;
  const prevTaille   = sortedGrowth.filter(g => g.taille)[1] || null;
  const prevCrane    = sortedGrowth.filter(g => g.crane)[1] || null;

  const poidsChangeG   = latestPoids && prevPoids   ? (parseFloat(toDisplayWeight(latestPoids.poids))  - parseFloat(toDisplayWeight(prevPoids.poids))).toFixed(weightUnit === "lb" ? 2 : 0) : null;
  const tailleChangeCm = latestTaille && prevTaille ? (parseFloat(latestTaille.taille) - parseFloat(prevTaille.taille)).toFixed(1) : null;
  const craneChangeCm  = latestCrane && prevCrane   ? (parseFloat(latestCrane.crane)   - parseFloat(prevCrane.crane)).toFixed(1)   : null;

  const birthPoids  = parseFloat(profile?.poidsNaissance)  || null;
  const birthTaille = parseFloat(profile?.tailleNaissance) || null;
  const poidsPct  = birthPoids  && latestPoids  ? (((parseFloat(latestPoids.poids)   - birthPoids)  / birthPoids)  * 100).toFixed(1) : null;
  const taillePct = birthTaille && latestTaille ? (((parseFloat(latestTaille.taille) - birthTaille) / birthTaille) * 100).toFixed(1) : null;

  const poidsParJour = (() => {
    if (!birthPoids || !latestPoids || !profile?.dateNaissance) return null;
    const [by, bmo, bd] = profile.dateNaissance.split("-").map(Number);
    const [bh, bmi] = (profile.heureNaissance || "00:00").split(":").map(Number);
    const birthDt = new Date(by, bmo - 1, bd, bh, bmi);
    const [ly, lmo, ld] = latestPoids.date.split("-").map(Number);
    const latestDt = new Date(ly, lmo - 1, ld, 12, 0);
    const diffDays = (latestDt - birthDt) / 86400000;
    if (diffDays <= 0) return null;
    return ((parseFloat(latestPoids.poids) - birthPoids) / diffDays).toFixed(1);
  })();

  const hasAnyData = latestPoids || latestTaille || latestCrane;

  return (
    <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: textPrimary }}>📏 Croissance</h2>
        <button onClick={() => setShowGrowthForm(true)} style={{ background: "linear-gradient(135deg,#e8906a,#e06b8a)", color: "white", border: "none", borderRadius: 50, padding: "9px 18px", fontSize: 14, fontWeight: "bold", cursor: "pointer" }}>+ Mesure</button>
      </div>

      {/* Unit toggles */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: textSecondary, fontWeight: "bold" }}>⚖️</span>
          <div style={{ display: "flex", borderRadius: 20, overflow: "hidden", border: `2px solid ${dark ? "#3a3a5e" : "#e8c5a8"}` }}>
            {[["g", "g"], ["lb", "lb"]].map(([unit, label]) => (
              <button key={unit} onClick={() => setWeightUnit(unit)} style={{ padding: "4px 14px", border: "none", background: weightUnit === unit ? "#e8906a" : (dark ? "#1e1e30" : "#fafafa"), color: weightUnit === unit ? "white" : (dark ? "#888" : "#aaa"), fontWeight: "bold", fontSize: 12, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: textSecondary, fontWeight: "bold" }}>📏</span>
          <div style={{ display: "flex", borderRadius: 20, overflow: "hidden", border: `2px solid ${dark ? "#3a3a5e" : "#e8c5a8"}` }}>
            {[["cm", "cm"], ["ft", "pi/po"]].map(([unit, label]) => (
              <button key={unit} onClick={() => setHeightUnit(unit)} style={{ padding: "4px 14px", border: "none", background: heightUnit === unit ? "#1565c0" : (dark ? "#1e1e30" : "#fafafa"), color: heightUnit === unit ? "white" : (dark ? "#888" : "#aaa"), fontWeight: "bold", fontSize: 12, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Birth reference */}
      {(profile?.poidsNaissance || profile?.tailleNaissance || profile?.perimCranien) && (
        <div style={{ background: dark ? "#1a2a1a" : "#e8f5e9", borderRadius: 12, padding: "10px 14px", marginBottom: 14, borderLeft: "4px solid #4caf50" }}>
          <div style={{ fontSize: 12, fontWeight: "bold", color: dark ? "#a5d6a7" : "#2e7d32", marginBottom: 6 }}>🏥 Données de naissance (profil)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {profile.poidsNaissance && <span style={{ background: dark ? "#1a3020" : "#c8e6c9", borderRadius: 20, padding: "2px 10px", fontSize: 12, color: dark ? "#a5d6a7" : "#1b5e20", fontWeight: "bold" }}>⚖️ {toDisplayWeight(profile.poidsNaissance)} {weightUnitLabel()}</span>}
            {profile.tailleNaissance && <span style={{ background: dark ? "#1a2a40" : "#bbdefb", borderRadius: 20, padding: "2px 10px", fontSize: 12, color: dark ? "#90caf9" : "#0d47a1", fontWeight: "bold" }}>📏 {toDisplayHeight(profile.tailleNaissance)} {heightUnit === "cm" ? "cm" : ""}</span>}
            {profile.perimCranien && <span style={{ background: dark ? "#2a1a2a" : "#e1bee7", borderRadius: 20, padding: "2px 10px", fontSize: 12, color: dark ? "#ce93d8" : "#4a148c", fontWeight: "bold" }}>🔵 {profile.perimCranien} cm crâne</span>}
          </div>
        </div>
      )}

      {/* Latest stats */}
      {hasAnyData && (
        <div style={{ background: dark ? "#2a2a3e" : "#fff8f0", borderRadius: 16, padding: 14, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 12, color: textSecondary, marginBottom: 10, fontWeight: "bold" }}>📊 Dernières mesures</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {latestPoids && (
              <div style={{ flex: "1 1 28%", background: dark ? "#1a3020" : "#e8f5e9", borderRadius: 12, padding: "10px 10px", textAlign: "center", minWidth: 90 }}>
                <div style={{ fontSize: 10, color: dark ? "#a5d6a7" : "#2e7d32", marginBottom: 3, fontWeight: "bold" }}>⚖️ {formatDateShort(latestPoids.date)}</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: dark ? "#a5d6a7" : "#2e7d32" }}>{toDisplayWeight(latestPoids.poids)}<span style={{ fontSize: 10 }}> {weightUnitLabel()}</span></div>
                {poidsChangeG && <div style={{ fontSize: 10, color: parseFloat(poidsChangeG) >= 0 ? "#4caf50" : "#e53935", marginTop: 2 }}>{parseFloat(poidsChangeG) >= 0 ? "▲" : "▼"} {Math.abs(poidsChangeG)}{weightUnitLabel()}</div>}
                {poidsPct !== null && <div style={{ fontSize: 10, marginTop: 2, fontWeight: "bold", color: parseFloat(poidsPct) >= 0 ? (dark ? "#a5d6a7" : "#2e7d32") : (dark ? "#f48fb1" : "#e53935") }}>{parseFloat(poidsPct) >= 0 ? "▲" : "▼"} {Math.abs(poidsPct)}% naissance</div>}
                {poidsParJour !== null && <div style={{ fontSize: 10, marginTop: 2, color: parseFloat(poidsParJour) >= 0 ? "#4caf50" : "#e53935" }}>{parseFloat(poidsParJour) >= 0 ? "▲" : "▼"} {Math.abs(poidsParJour)}g/j moy.</div>}
              </div>
            )}
            {latestTaille && (
              <div style={{ flex: "1 1 28%", background: dark ? "#1a2a40" : "#e3f2fd", borderRadius: 12, padding: "10px 10px", textAlign: "center", minWidth: 90 }}>
                <div style={{ fontSize: 10, color: dark ? "#90caf9" : "#1565c0", marginBottom: 3, fontWeight: "bold" }}>📏 {formatDateShort(latestTaille.date)}</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: dark ? "#90caf9" : "#1565c0" }}>{toDisplayHeight(latestTaille.taille)}</div>
                {tailleChangeCm && <div style={{ fontSize: 10, color: parseFloat(tailleChangeCm) >= 0 ? "#4caf50" : "#e53935", marginTop: 2 }}>{parseFloat(tailleChangeCm) >= 0 ? "▲" : "▼"} {Math.abs(tailleChangeCm)}cm</div>}
                {taillePct !== null && <div style={{ fontSize: 10, marginTop: 2, fontWeight: "bold", color: parseFloat(taillePct) >= 0 ? (dark ? "#90caf9" : "#1565c0") : (dark ? "#f48fb1" : "#e53935") }}>{parseFloat(taillePct) >= 0 ? "▲" : "▼"} {Math.abs(taillePct)}% naissance</div>}
              </div>
            )}
            {latestCrane && (
              <div style={{ flex: "1 1 28%", background: dark ? "#2a1a3a" : "#f3e5f5", borderRadius: 12, padding: "10px 10px", textAlign: "center", minWidth: 90 }}>
                <div style={{ fontSize: 10, color: dark ? "#ce93d8" : "#6a1b9a", marginBottom: 3, fontWeight: "bold" }}>🔵 {formatDateShort(latestCrane.date)}</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: dark ? "#ce93d8" : "#6a1b9a" }}>{parseFloat(latestCrane.crane).toFixed(1)}<span style={{ fontSize: 10 }}> cm</span></div>
                {craneChangeCm && <div style={{ fontSize: 10, color: parseFloat(craneChangeCm) >= 0 ? "#4caf50" : "#e53935", marginTop: 2 }}>{parseFloat(craneChangeCm) >= 0 ? "▲" : "▼"} {Math.abs(craneChangeCm)}cm</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["graphique", "📈 Graphique"], ["liste", "📋 Liste"]].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "2px solid", borderColor: view === key ? "#e8906a" : "#ddd", background: view === key ? (dark ? "rgba(232,144,106,0.15)" : "#fff0e8") : (dark ? "#1e1e30" : "#fafafa"), color: view === key ? "#e8906a" : (dark ? "#666" : "#aaa"), fontWeight: "bold", fontSize: 14, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {growth.length === 0 && (
        <div style={{ textAlign: "center", color: "#c9a07a", marginTop: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📏</div>
          Aucune mesure enregistrée.
        </div>
      )}

      {/* Graphique view */}
      {view === "graphique" && growth.length > 0 && (
        <div style={{ background: cardBg, borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["poids", `⚖️ Poids (${weightUnitLabel()})`, "#2e7d32", "#a5d6a7"], ["taille", `📏 Taille (${heightUnitLabel()})`, "#1565c0", "#90caf9"], ["crane", "🔵 Crâne (cm)", "#6a1b9a", "#ce93d8"]].map(([key, label, light, dk]) => (
              <button key={key} onClick={() => setMetric(key)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "2px solid", borderColor: metric === key ? (dark ? dk : light) : "#ddd", background: metric === key ? (dark ? dk + "22" : light + "22") : (dark ? "#1e1e30" : "#fafafa"), color: metric === key ? (dark ? dk : light) : (dark ? "#555" : "#aaa"), fontWeight: "bold", fontSize: 12, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={() => setShowWho(v => !v)} style={{ padding: "5px 12px", borderRadius: 20, border: "2px solid", borderColor: showWho ? "#4caf50" : "#ddd", background: showWho ? (dark ? "rgba(76,175,80,0.15)" : "#e8f5e9") : (dark ? "#1e1e30" : "#fafafa"), color: showWho ? "#4caf50" : (dark ? "#555" : "#aaa"), fontWeight: "bold", fontSize: 11, cursor: "pointer" }}>
              📊 Courbes OMS {showWho ? "✓" : ""}
            </button>
          </div>
          <GrowthLineChart
            key={`${metric}-${weightUnit}-${heightUnit}`}
            data={sorted}
            valueKey={metric === "poids" ? "_poidsDisplay" : metric === "taille" ? "_tailleDisplay" : "_craneDisplay"}
            color={metric === "poids" ? (dark ? "#a5d6a7" : "#2e7d32") : metric === "taille" ? (dark ? "#90caf9" : "#1565c0") : (dark ? "#ce93d8" : "#6a1b9a")}
            unit={metric === "poids" ? weightUnitLabel() : metric === "taille" ? (heightUnit === "ft" ? "po" : "cm") : "cm"}
            dark={dark} showWho={showWho}
            whoTable={weightUnit === "g" ? getWhoTable(metric, profile?.sexe) : null}
            birthDate={profile?.dateNaissance || null}
            birthHeureNaissance={profile?.heureNaissance || "00:00"}
            birthPoidsG={metric === "poids" ? (parseFloat(profile?.poidsNaissance) || null) : null}
            weightUnit={weightUnit}
          />
          {showWho && !profile?.sexe && <div style={{ textAlign: "center", fontSize: 11, color: "#ff9800", marginTop: 6 }}>⚠️ Indique le sexe dans le profil pour les courbes OMS</div>}
          {showWho && !profile?.dateNaissance && profile?.sexe && <div style={{ textAlign: "center", fontSize: 11, color: "#ff9800", marginTop: 6 }}>⚠️ Indique la date de naissance dans le profil pour les courbes OMS</div>}
          {showWho && (
            <div style={{ marginTop: 12, background: dark ? "#1a2a1a" : "#f1f8f1", borderRadius: 12, padding: "12px 14px", border: `1px solid ${dark ? "#2a4a2a" : "#c8e6c9"}` }}>
              <div style={{ fontSize: 12, fontWeight: "bold", color: dark ? "#a5d6a7" : "#2e7d32", marginBottom: 8 }}>📊 Comment lire les courbes de l'OMS</div>
              <div style={{ fontSize: 11, color: dark ? "#888" : "#555", lineHeight: 1.6, marginBottom: 8 }}>Les courbes de l'Organisation Mondiale de la Santé (OMS) montrent la distribution du poids, de la taille et du périmètre crânien de bébés en bonne santé à travers le monde.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { color: "#4caf50", dash: false, label: "P50 — Médiane", desc: "50% des bébés sont en dessous de cette valeur. C'est la référence centrale." },
                  { color: "#ff9800", dash: true, label: "P15 et P85", desc: "Zone normale. 70% des bébés se trouvent entre ces deux courbes." },
                  { color: "#e53935", dash: true, label: "P3 et P97", desc: "Limites extrêmes. Moins de 6% des bébés sont en dehors. Une consultation médicale est recommandée." },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <svg width={24} height={12} style={{ flexShrink: 0, marginTop: 2 }}>
                      <line x1={0} y1={6} x2={24} y2={6} stroke={item.color} strokeWidth={item.label.includes("P50") ? 2 : 1.5} strokeDasharray={item.dash ? "4,2" : "none"} />
                    </svg>
                    <div><span style={{ fontSize: 11, fontWeight: "bold", color: item.color }}>{item.label} </span><span style={{ fontSize: 11, color: dark ? "#777" : "#666" }}>{item.desc}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: dark ? "#555" : "#999", fontStyle: "italic" }}>💡 Le percentile de bébé s'affiche en cliquant sur un point du graphique. Un percentile stable dans le temps est plus important que sa valeur absolue.</div>
            </div>
          )}
        </div>
      )}

      {/* Liste view */}
      {view === "liste" && sortedGrowth.map(g => (
        <div key={g.id} style={{ ...dynCardStyle, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: "bold", color: textPrimary, marginBottom: 4 }}>{formatDateShort(g.date)}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {g.poids && <span style={{ background: dark ? "#1a3020" : "#e8f5e9", borderRadius: 20, padding: "2px 10px", fontSize: 13, color: dark ? "#a5d6a7" : "#2e7d32", fontWeight: "bold" }}>⚖️ {toDisplayWeight(g.poids)} {weightUnitLabel()}</span>}
              {g.taille && <span style={{ background: dark ? "#1a2a40" : "#e3f2fd", borderRadius: 20, padding: "2px 10px", fontSize: 13, color: dark ? "#90caf9" : "#1565c0", fontWeight: "bold" }}>📏 {toDisplayHeight(g.taille)} {heightUnit === "cm" ? "cm" : ""}</span>}
              {g.crane && <span style={{ background: dark ? "#2a1a3a" : "#f3e5f5", borderRadius: 20, padding: "2px 10px", fontSize: 13, color: dark ? "#ce93d8" : "#6a1b9a", fontWeight: "bold" }}>🔵 {parseFloat(g.crane).toFixed(1)} cm</span>}
            </div>
            {g.note && <div style={{ marginTop: 6, fontSize: 12, color: "#8a6a5a", fontStyle: "italic" }}>"{g.note}"</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onEdit(g)} style={{ background: "#f0f8ff", border: "none", borderRadius: 8, width: 30, height: 30, fontSize: 14, cursor: "pointer" }}>✏️</button>
            <button onClick={() => setConfirmDelete({ message: "Supprimer cette mesure de croissance ?", onConfirm: () => deleteDoc(doc(db, "growth", String(g.id))) })} style={{ background: "#fff0f0", border: "none", borderRadius: 8, width: 30, height: 30, fontSize: 14, cursor: "pointer" }}>🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}
