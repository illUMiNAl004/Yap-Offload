"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  BookOpen,
} from "lucide-react";
import { useDB, setPhoto, dayKey } from "@/lib/store";
import { fileToDataUrl } from "@/lib/photo";
import { fmtTime } from "@/lib/format";

// squarer cards
const CARD_W = 246;
const CARD_H = 224;
// corridor geometry — wall distance is CONSTANT; only depth grows, so cards
// fan out along the perspective lines toward the room corners.
const WALL_X = 340;
const STEP_Z = 180;
const ANGLE = 60;
const WINDOW = 5;

type Day = {
  key: string;
  date: Date;
  photo?: string;
  journal?: { body: string; highlights: string[] };
  events: { id: string; title: string; start: string; location: string | null; allDay: boolean }[];
  notes: { id: string; title: string; body: string }[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function CalendarPage() {
  const db = useDB();
  const [active, setActive] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const drag = useRef<{ x: number; start: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const acc = useRef(0);

  const days: Day[] = useMemo(() => {
    const today = startOfDay(new Date());
    const stamps: number[] = [];
    const collect = (iso: string) => {
      const t = startOfDay(new Date(iso)).getTime();
      if (!isNaN(t)) stamps.push(t);
    };
    db.journal.forEach((j) => collect(j.createdAt));
    db.notes.forEach((n) => collect(n.createdAt));
    db.events.forEach((e) => collect(e.start));
    Object.keys(db.photos).forEach((k) => collect(k));
    let earliest = stamps.length ? Math.min(...stamps) : today.getTime();
    earliest = Math.min(earliest, today.getTime() - 20 * 86400000);
    earliest = Math.max(earliest, today.getTime() - 120 * 86400000);

    const out: Day[] = [];
    for (let t = earliest; t <= today.getTime(); t += 86400000) {
      const date = new Date(t);
      const key = dayKey(date);
      const j = db.journal.find((x) => dayKey(x.createdAt) === key);
      out.push({
        key,
        date,
        photo: db.photos[key],
        journal: j ? { body: j.body, highlights: j.highlights } : undefined,
        events: db.events
          .filter((e) => dayKey(e.start) === key)
          .map((e) => ({ id: e.id, title: e.title, start: e.start, location: e.location, allDay: e.allDay })),
        notes: db.notes
          .filter((n) => dayKey(n.createdAt) === key)
          .map((n) => ({ id: n.id, title: n.title, body: n.body })),
      });
    }
    return out;
  }, [db]);

  useEffect(() => {
    setActive(days.length - 1);
  }, [days.length]);

  const clamp = (n: number) => Math.max(0, Math.min(days.length - 1, n));
  const go = (delta: number) => setActive((a) => clamp(a + delta));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [days.length]);

  // measure the stage so the room frame can match the centered card exactly
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // scroll-walks-the-corridor: wheel/trackpad over the stage steps through days
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const STEP = 55;
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 1) return;
      e.preventDefault();
      acc.current += d;
      while (Math.abs(acc.current) >= STEP) {
        const dir = acc.current > 0 ? 1 : -1;
        acc.current -= dir * STEP;
        setActive((a) => Math.max(0, Math.min(days.length - 1, a + dir)));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [days.length]);

  const activeDay = days[active];

  async function pickPhoto(key: string, file?: File) {
    if (!file) return;
    try {
      setPhoto(key, await fileToDataUrl(file));
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-2 sm:px-8">
      {/* header */}
      <div className="mb-2">
        <h1 className="font-serif text-5xl tracking-tight text-ink sm:text-6xl">
          Calendar<span className="text-accent">.</span>
        </h1>
        <p className="mt-1.5 text-lg text-muted">
          Step through your days, one <span className="mark text-ink">memory</span> at a time.
        </p>
      </div>

      {/* the gallery room */}
      <div
        ref={stageRef}
        className="relative h-[clamp(360px,50vh,520px)] touch-none select-none overflow-hidden"
        style={{ perspective: 1500 }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, start: active };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setActive(clamp(drag.current.start - Math.round((e.clientX - drag.current.x) / 90)));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <RoomLines w={size.w} h={size.h} />

        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {days.map((day, i) => {
            const o = i - active;
            const n = Math.abs(o);
            if (n > WINDOW) return null;
            const side = Math.sign(o);
            let tf: string;
            if (n === 0) {
              // sits in the back-wall plane, exactly inside the room frame
              tf = "translateX(0px) translateZ(0px) rotateY(0deg)";
            } else {
              // constant wall distance, growing depth → fans along the room lines
              tf = `translateX(${side * WALL_X}px) translateZ(${-n * STEP_Z}px) rotateY(${-side * ANGLE}deg)`;
            }
            return (
              <div
                key={day.key}
                onClick={() => setActive(i)}
                className="absolute left-1/2 top-1/2 cursor-pointer"
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  transform: `translate(-50%, -50%) ${tf}`,
                  transformStyle: "preserve-3d",
                  transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s",
                  zIndex: n === 0 ? 300 : 200 - n,
                  opacity: n >= WINDOW ? 0 : n >= 4 ? 0.55 : 1,
                }}
              >
                <DayCard day={day} center={n === 0} onPick={pickPhoto} />
                {/* soft floor reflection */}
                <div
                  aria-hidden
                  className="absolute left-0 w-full overflow-hidden"
                  style={{
                    top: "100%",
                    height: CARD_H * 0.7,
                    marginTop: 5,
                    transform: "scaleY(-1)",
                    transformOrigin: "top",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 72%)",
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 72%)",
                    opacity: n === 0 ? 0.42 : 0.22,
                    pointerEvents: "none",
                  }}
                >
                  <DayCard day={day} center={false} reflection onPick={() => {}} />
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => go(-1)}
          disabled={active <= 0}
          className="card absolute left-2 top-1/2 z-[400] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full disabled:opacity-30"
        >
          <ChevronLeft size={20} className="text-ink-soft" />
        </button>
        <button
          onClick={() => go(1)}
          disabled={active >= days.length - 1}
          className="card absolute right-2 top-1/2 z-[400] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full disabled:opacity-30"
        >
          <ChevronRight size={20} className="text-ink-soft" />
        </button>
      </div>

      {/* active day label + details below */}
      {activeDay && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="mx-auto mt-2 max-w-2xl"
          >
            <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
              <p className="font-serif text-4xl italic text-ink sm:text-5xl">
                {activeDay.date.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
                {activeDay.key === dayKey(new Date()) && (
                  <span className="ml-2 align-middle text-base not-italic text-accent">· Today</span>
                )}
              </p>
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink-soft shadow-[var(--shadow-card)] transition hover:text-ink">
                Jump to
                <input
                  type="date"
                  value={activeDay.key}
                  max={dayKey(new Date())}
                  onChange={(e) => {
                    const idx = days.findIndex((d) => d.key === e.target.value);
                    if (idx >= 0) setActive(idx);
                  }}
                  className="bg-transparent font-sans font-medium text-ink outline-none"
                />
              </label>
            </div>

            <DayDetails day={activeDay} onPick={pickPhoto} />
          </motion.div>
        </AnimatePresence>
      )}
    </main>
  );
}

function RoomLines({ w, h }: { w: number; h: number }) {
  if (!w || !h) return null;
  // back-wall frame == the centered card's footprint, so the lines always
  // connect to the center image's corners regardless of viewport size.
  const x = (w - CARD_W) / 2;
  const y = (h - CARD_H) / 2;
  const x2 = x + CARD_W;
  const y2 = y + CARD_H;
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={w}
      height={h}
      style={{ color: "var(--color-line)" }}
    >
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={16} fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1={0} y1={0} x2={x} y2={y} stroke="currentColor" strokeWidth="1" />
      <line x1={w} y1={0} x2={x2} y2={y} stroke="currentColor" strokeWidth="1" />
      <line x1={0} y1={h} x2={x} y2={y2} stroke="currentColor" strokeWidth="1" />
      <line x1={w} y1={h} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function DayCard({
  day,
  center,
  reflection,
  onPick,
}: {
  day: Day;
  center: boolean;
  reflection?: boolean;
  onPick: (key: string, file?: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const weekday = day.date.toLocaleDateString(undefined, { weekday: "short" });
  const isToday = day.key === dayKey(new Date());

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border bg-surface-2"
      style={{
        borderColor: center ? "var(--color-line-strong)" : "var(--color-line)",
        boxShadow: reflection ? "none" : center ? "var(--shadow-float)" : "var(--shadow-card)",
      }}
    >
      {day.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={day.photo} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted">
          {center && !reflection && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs text-white shadow-[0_8px_20px_-8px_var(--color-accent)]"
            >
              <Camera size={13} /> Add photo
            </button>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3 text-white">
        <div className="leading-none">
          <p className="text-[10px] uppercase tracking-wide opacity-80">{weekday}</p>
          <p className="font-serif text-2xl">{day.date.getDate()}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {day.journal && <BookOpen size={13} className="opacity-90" />}
          {isToday && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        </div>
      </div>
      {!center && !reflection && <div className="absolute inset-0 bg-black/20" />}

      {!reflection && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onPick(day.key, e.target.files?.[0])}
        />
      )}
    </div>
  );
}

function DayDetails({ day, onPick }: { day: Day; onPick: (key: string, file?: File) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const empty = !day.journal && day.events.length === 0 && day.notes.length === 0;

  return (
    <div className="text-left">
      {!day.photo && (
        <div className="mb-4 text-center">
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink-soft transition hover:text-ink"
          >
            <Camera size={15} /> Add this day&apos;s photo
          </button>
        </div>
      )}

      {empty ? (
        <p className="text-center text-muted">A quiet day. Nothing recorded.</p>
      ) : (
        <div className="card space-y-6 p-7">
          {day.journal && (
            <p className="whitespace-pre-wrap font-serif text-xl leading-relaxed text-ink-soft">
              {day.journal.body}
            </p>
          )}

          {day.journal && day.journal.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {day.journal.highlights.map((h, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-ink-soft"
                >
                  <Sparkles size={12} className="text-accent" /> {h}
                </span>
              ))}
            </div>
          )}

          {day.events.length > 0 && (
            <div>
              <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-event">Events</h3>
              <ul className="space-y-2">
                {day.events.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-ink-soft">
                    <Clock size={14} className="text-event" />
                    <span className="text-ink">{e.title}</span>
                    {!e.allDay && <span className="text-muted">· {fmtTime(e.start)}</span>}
                    {e.location && (
                      <span className="flex items-center gap-1 text-muted">
                        <MapPin size={12} /> {e.location}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {day.notes.length > 0 && (
            <div>
              <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-note">Notes</h3>
              <ul className="space-y-3">
                {day.notes.map((n) => (
                  <li key={n.id}>
                    <p className="text-ink">{n.title}</p>
                    <p className="leading-relaxed text-ink-soft">{n.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(day.key, e.target.files?.[0])}
      />
    </div>
  );
}
