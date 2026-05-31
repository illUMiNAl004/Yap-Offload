"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  Mic,
  Check,
  ArrowUpRight,
  MapPin,
  Sparkles,
  Sun,
  CloudSun,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CalendarClock,
} from "lucide-react";
import { useDB, toggleTodo, dayKey, journalStreak } from "@/lib/store";
import { fmtDay, fmtTime, isPast } from "@/lib/format";
import { useRecord } from "@/components/RecordProvider";
import { useWeather } from "@/lib/useWeather";

function greeting(h: number) {
  if (h < 5) return "Still up?";
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  if (h < 22) return "Good evening.";
  return "Winding down?";
}

function WeatherIcon({ code, size = 18 }: { code: number; size?: number }) {
  const cls = "text-accent";
  if (code === 0) return <Sun size={size} className={cls} />;
  if (code <= 3) return <CloudSun size={size} className={cls} />;
  if (code <= 48) return <CloudFog size={size} className={cls} />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain size={size} className={cls} />;
  if (code <= 86) return <CloudSnow size={size} className={cls} />;
  return <CloudLightning size={size} className={cls} />;
}

export default function Today() {
  const db = useDB();
  const { open } = useRecord();
  const weather = useWeather();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const todayKey = now ? dayKey(now) : "";
  const active = db.todos.filter((t) => !t.done).slice(0, 6);
  const latest = db.journal[0];
  const sortedEvents = [...db.events].sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const todayEvents = sortedEvents.filter((e) => dayKey(e.start) === todayKey);
  const upcoming = sortedEvents.filter((e) => !isPast(e.start) && dayKey(e.start) !== todayKey).slice(0, 4);
  const recentNotes = db.notes.slice(0, 3);
  const streak = journalStreak(db);
  const nothing = !db.journal.length && !db.todos.length && !db.events.length && !db.notes.length;

  const g = now ? greeting(now.getHours()) : "Hello.";
  const gHead = g.slice(0, -1);
  const gTail = g.slice(-1);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-28 pt-6 sm:px-8">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex flex-wrap items-end justify-between gap-5"
      >
        <div>
          <h1 className="font-serif text-7xl tracking-tight text-ink sm:text-8xl">
            {gHead}
            <span className="text-accent">{gTail}</span>
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-muted">
            {streak > 0 && (
              <span>
                {streak}-day journaling streak{streak >= 3 ? " — keep it lit" : ""}
              </span>
            )}
            {weather && (
              <span className="flex items-center gap-1.5 text-ink-soft">
                <WeatherIcon code={weather.code} size={18} />
                {weather.temp}° · {weather.label}
              </span>
            )}
          </p>
          {now && (
            <div className="mt-4 flex items-end gap-3">
              <span className="font-serif text-7xl leading-[0.8] text-accent">{now.getDate()}</span>
              <span className="pb-1 text-lg leading-tight text-ink-soft">
                {now.toLocaleDateString(undefined, { weekday: "long" })}
                <br />
                {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={open}
          className="flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-lg text-white shadow-[0_12px_30px_-10px_var(--color-accent)] transition hover:brightness-105"
        >
          <Mic size={19} /> Talk your day out
        </button>
      </motion.div>

      {nothing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card flex flex-col items-center gap-6 px-6 py-28 text-center"
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-surface-2">
            <Mic size={30} className="text-accent" />
          </div>
          <p className="max-w-xl font-serif text-3xl text-ink">
            Talk through your day — I&apos;ll turn it into your journal, tasks, events, and notes.
          </p>
          <button
            onClick={open}
            className="rounded-full bg-accent px-7 py-3 text-lg text-white transition hover:brightness-105"
          >
            Start talking
          </button>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {/* PRIORITY ONE: today's schedule */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card card-hover p-7 sm:p-8"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarClock size={20} className="text-event" />
                <h2 className="font-serif text-3xl text-ink">On your calendar today</h2>
              </div>
              <Link href="/calendar" className="text-muted transition hover:text-ink">
                <ArrowUpRight size={20} />
              </Link>
            </div>
            {todayEvents.length ? (
              <ul className="divide-y divide-line">
                {todayEvents.map((e) => (
                  <li key={e.id} className="flex items-baseline gap-5 py-4">
                    <span className="w-24 shrink-0 font-serif text-2xl text-event">
                      {e.allDay ? "All day" : fmtTime(e.start)}
                    </span>
                    <div>
                      <p className="text-xl text-ink">{e.title}</p>
                      {e.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-base text-muted">
                          <MapPin size={14} /> {e.location}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-lg text-muted">
                Nothing scheduled today.{" "}
                {upcoming[0] && (
                  <span className="text-ink-soft">
                    Next up: {upcoming[0].title} · {fmtDay(upcoming[0].start)}.
                  </span>
                )}
              </p>
            )}
          </motion.section>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Tasks */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card card-hover p-7"
            >
              <SectionTitle label="Tasks" href="/tasks" color="var(--color-task)" />
              {active.length === 0 ? (
                <p className="mt-5 text-lg text-muted">Nothing on your plate. Nice.</p>
              ) : (
                <ul className="mt-4 space-y-1">
                  {active.map((t) => (
                    <li key={t.id} className="group flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2">
                      <button
                        onClick={() => toggleTodo(t.id)}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-line-strong transition hover:border-task"
                      >
                        <Check size={13} className="text-task opacity-0 group-hover:opacity-40" strokeWidth={3} />
                      </button>
                      <span className="flex-1 text-lg text-ink">{t.title}</span>
                      {t.due && <span className="text-sm text-muted">{fmtDay(t.due)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>

            {/* Latest reflection */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card card-hover p-7 lg:col-span-2"
            >
              <SectionTitle label="Latest reflection" href="/journal" color="var(--color-journal)" />
              {latest ? (
                <>
                  <p className="mt-4 line-clamp-4 font-serif text-2xl leading-relaxed text-ink-soft">
                    {latest.body || "—"}
                  </p>
                  {latest.highlights.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {latest.highlights.slice(0, 3).map((h, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-1.5 text-sm text-ink-soft"
                        >
                          <Sparkles size={12} className="text-accent" /> {h}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-5 text-lg text-muted">No reflections yet.</p>
              )}
            </motion.section>

            {/* Coming up */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card card-hover p-7"
            >
              <SectionTitle label="Coming up" href="/calendar" color="var(--color-event)" />
              {upcoming.length ? (
                <ul className="mt-4 space-y-4">
                  {upcoming.map((e) => (
                    <li key={e.id} className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-event" />
                      <div className="min-w-0">
                        <p className="truncate text-lg text-ink">{e.title}</p>
                        <p className="text-sm text-muted">
                          {e.allDay ? fmtDay(e.start) : `${fmtDay(e.start)} · ${fmtTime(e.start)}`}
                          {e.location ? ` · ${e.location}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-lg text-muted">Nothing on the horizon.</p>
              )}
            </motion.section>

            {/* Notes */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card card-hover p-7 lg:col-span-2"
            >
              <SectionTitle label="Notes" href="/notes" color="var(--color-note)" />
              {recentNotes.length ? (
                <ul className="mt-4 space-y-4">
                  {recentNotes.map((n) => (
                    <li key={n.id}>
                      <p className="text-lg text-ink">{n.title}</p>
                      <p className="line-clamp-2 text-base leading-relaxed text-muted">{n.body}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-lg text-muted">No notes yet.</p>
              )}
            </motion.section>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionTitle({ label, href, color }: { label: string; href: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-soft">{label}</h2>
      </div>
      <Link href={href} className="text-muted transition hover:text-ink">
        <ArrowUpRight size={18} />
      </Link>
    </div>
  );
}
