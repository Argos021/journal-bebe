// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatDuration(totalMinutes) {
  const mins = parseInt(totalMinutes);
  if (!mins) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export function formatTime(date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function getNextFeedingTime(timeStr, durationMinutes) {
  if (!timeStr || !durationMinutes) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const base = new Date();
  base.setHours(h, m, 0, 0);
  base.setMinutes(base.getMinutes() + parseInt(durationMinutes));
  return formatTime(base);
}

export function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,"0");
  const d = String(now.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

export function getNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
}

export function timeSince(dateStr, timeStr) {
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
