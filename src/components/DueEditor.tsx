"use client";

const pad = (n: number) => String(n).padStart(2, "0");

function toParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = d.getHours() || d.getMinutes() ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "";
  return { date, time };
}

function combine(date: string, time: string): string | null {
  if (!date) return null;
  const [y, m, dd] = date.split("-").map(Number);
  let h = 0;
  let mi = 0;
  if (time) {
    const [hh, mm] = time.split(":").map(Number);
    h = hh;
    mi = mm;
  }
  return new Date(y, m - 1, dd, h, mi, 0, 0).toISOString();
}

/** Date + optional time. Leave time blank → a date-only task (no specific time). */
export default function DueEditor({
  value,
  onChange,
  accent = "var(--color-task)",
}: {
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  accent?: string;
}) {
  const { date, time } = toParts(value);
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(combine(e.target.value, time))}
        className="rounded-lg border border-line bg-transparent px-2 py-1 text-xs outline-none"
        style={{ color: accent }}
      />
      <input
        type="time"
        step={900}
        value={time}
        disabled={!date}
        onChange={(e) => onChange(combine(date, e.target.value))}
        title={date ? "Add a time (optional)" : "Pick a date first"}
        className="rounded-lg border border-line bg-transparent px-2 py-1 text-xs outline-none disabled:opacity-40"
        style={{ color: accent }}
      />
    </span>
  );
}
