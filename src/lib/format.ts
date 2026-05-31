export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDay(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  const tmrw = new Date();
  tmrw.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return "Today";
  if (same(d, tmrw)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function isPast(iso: string): boolean {
  const d = new Date(iso);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}
