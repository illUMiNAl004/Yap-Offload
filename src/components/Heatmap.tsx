"use client";

import { useDB, dayKey } from "@/lib/store";

const WEEKS = 53;
const DAY_MS = 86400000;

function cellColor(n: number): string {
  if (!n) return "var(--color-surface-2)";
  const a = n >= 4 ? 1 : n >= 3 ? 0.75 : n >= 2 ? 0.55 : 0.32;
  return `color-mix(in srgb, var(--color-accent) ${Math.round(a * 100)}%, transparent)`;
}

export default function Heatmap() {
  const db = useDB();

  // count completions per day: finished tasks (completedAt) + habit ticks (history)
  const counts: Record<string, number> = {};
  for (const t of db.todos) {
    if (t.completedAt) {
      const k = dayKey(t.completedAt);
      counts[k] = (counts[k] || 0) + 1;
    }
    for (const h of t.history) counts[h] = (counts[h] || 0) + 1;
  }

  // build a grid aligned to weeks (columns), Sun..Sat (rows)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay())); // end of this week (Sat)
  const start = new Date(end);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));

  const weeks: { key: string; date: Date; count: number; future: boolean }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { key: string; date: Date; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      const key = dayKey(date);
      col.push({ key, date, count: counts[key] || 0, future: date > today });
    }
    weeks.push(col);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // current streak: consecutive days up to today with activity
  let streak = 0;
  const cur = new Date(today);
  while ((counts[dayKey(cur)] || 0) > 0) {
    streak++;
    cur.setTime(cur.getTime() - DAY_MS);
  }

  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((col, i) => {
    const m = col[0].date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: i, label: col[0].date.toLocaleDateString(undefined, { month: "short" }) });
      lastMonth = m;
    }
  });

  return (
    <div className="card p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-serif text-2xl text-ink">Activity</h3>
          <p className="text-sm text-muted">
            {total} done this year
            {streak > 0 && <> · 🔥 {streak}-day streak</>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          Less
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} className="h-3 w-3 rounded-[3px]" style={{ background: cellColor(n), border: "1px solid var(--color-line)" }} />
          ))}
          More
        </div>
      </div>

      <div className="no-scrollbar overflow-x-auto pb-1">
        <div className="inline-block">
          {/* month labels */}
          <div className="relative mb-1 ml-7 h-4" style={{ width: WEEKS * 16 }}>
            {monthLabels.map((m) => (
              <span key={m.col} className="absolute text-[10px] text-muted" style={{ left: m.col * 16 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {/* weekday labels */}
            <div className="mr-1 flex flex-col gap-[3px] text-[9px] text-muted">
              {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                <span key={i} className="h-[13px] leading-[13px]">{d}</span>
              ))}
            </div>
            {weeks.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((cell) => (
                  <span
                    key={cell.key}
                    title={`${cell.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${cell.count} done`}
                    className="h-[13px] w-[13px] rounded-[3px]"
                    style={{
                      background: cell.future ? "transparent" : cellColor(cell.count),
                      border: cell.future ? "none" : "1px solid var(--color-line)",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
