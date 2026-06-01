"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowLeft, Check, Play, Pause, RotateCcw, Plus, Timer, Grid2x2, Columns3, GripVertical, SquareKanban, Music, CalendarDays, MapPin, Clock } from "lucide-react";
import { useDB, toggleTodo, updateTodo, dayKey, type StoredTodo, type StoredEvent } from "@/lib/store";
import { fmtDay, fmtTime } from "@/lib/format";
import SoundControls from "@/components/SoundControls";

type View = "lanes" | "kanban" | "matrix" | "calendar" | "focus" | "sounds";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
function atFutureEvening(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

function horizon(t: StoredTodo): "overdue" | "today" | "week" | "later" | "someday" {
  if (!t.due) return "someday";
  const due = new Date(t.due).getTime();
  const start = startOfToday().getTime();
  if (due < start) return "overdue";
  if (due < start + 86400000) return "today";
  if (due < start + 7 * 86400000) return "week";
  return "later";
}
const isUrgent = (t: StoredTodo) => !!t.due && new Date(t.due).getTime() <= Date.now() + 2 * 86400000;
const isImportant = (t: StoredTodo) => t.priority === "high";

// ── draggable + droppable primitives ──
function DragTask({ t }: { t: StoredTodo }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none",
      }}
      className="group flex items-start gap-2 rounded-lg px-2 py-2 transition hover:bg-surface-2"
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => toggleTodo(t.id)}
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-line-strong transition hover:border-task"
        aria-label="Complete"
      >
        <Check size={11} className="text-task opacity-0 group-hover:opacity-50" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-ink">{t.title}</p>
        {t.due && (
          <p className="text-xs text-muted">
            {fmtDay(t.due)}
            {new Date(t.due).getHours() ? ` · ${fmtTime(t.due)}` : ""}
          </p>
        )}
      </div>
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag"
      >
        <GripVertical size={15} className="text-muted" />
      </button>
    </div>
  );
}

function DropZone({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={className}
      style={{ outline: isOver ? "2px solid var(--color-accent)" : undefined, outlineOffset: 3, borderRadius: 14 }}
    >
      {children}
    </div>
  );
}

export default function OrganizePage() {
  const db = useDB();
  const [view, setView] = useState<View>("lanes");
  const isHabit = (t: StoredTodo) => t.repeat && t.repeat !== "none";
  const allTasks = db.todos.filter((t) => !isHabit(t));
  const active = allTasks.filter((t) => !t.done);

  const views: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "lanes", label: "Lanes", icon: <Columns3 size={16} /> },
    { key: "kanban", label: "Board", icon: <SquareKanban size={16} /> },
    { key: "matrix", label: "Matrix", icon: <Grid2x2 size={16} /> },
    { key: "calendar", label: "Calendar", icon: <CalendarDays size={16} /> },
    { key: "focus", label: "Focus", icon: <Timer size={16} /> },
    { key: "sounds", label: "Sounds", icon: <Music size={16} /> },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-6 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/tasks" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
            <ArrowLeft size={15} /> Tasks
          </Link>
          <h1 className="font-serif text-5xl tracking-tight text-ink sm:text-6xl">
            Organize &amp; focus<span className="text-accent">.</span>
          </h1>
        </div>
        <div className="glassy flex items-center gap-1 rounded-full border border-line p-1">
          {views.map((v) => (
            <button key={v.key} onClick={() => setView(v.key)} className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm">
              {view === v.key && (
                <motion.span layoutId="org-view" className="absolute inset-0 rounded-full bg-surface shadow-[var(--shadow-card)]" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
              )}
              <span className={`relative flex items-center gap-2 ${view === v.key ? "text-ink" : "text-muted"}`}>
                {v.icon} {v.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          {view === "sounds" ? (
            <div className="mx-auto max-w-xl">
              <SoundControls />
            </div>
          ) : view === "calendar" ? (
            <CalendarView events={db.events} tasks={allTasks} />
          ) : allTasks.length === 0 ? (
            <div className="card px-6 py-20 text-center text-muted">
              No tasks yet. Add some on the <Link href="/tasks" className="text-accent">Tasks</Link> page.
            </div>
          ) : view === "lanes" ? (
            <Lanes tasks={active} />
          ) : view === "kanban" ? (
            <Kanban tasks={allTasks} />
          ) : view === "matrix" ? (
            <Matrix tasks={active} />
          ) : (
            <Focus tasks={active} />
          )}
        </motion.div>
      </AnimatePresence>

      {(view === "lanes" || view === "kanban" || view === "matrix") && allTasks.length > 0 && (
        <p className="mt-5 text-center text-sm text-muted">Drag the ⋮ handle to move a task between columns.</p>
      )}
    </main>
  );
}

function useBoardSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );
}

function Lanes({ tasks }: { tasks: StoredTodo[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useBoardSensors();
  const lanes: { key: ReturnType<typeof horizon>; label: string; color: string; drop: boolean }[] = [
    { key: "overdue", label: "Overdue", color: "var(--color-accent)", drop: false },
    { key: "today", label: "Today", color: "var(--color-task)", drop: true },
    { key: "week", label: "This week", color: "var(--color-event)", drop: true },
    { key: "later", label: "Later", color: "var(--color-note)", drop: true },
    { key: "someday", label: "Someday", color: "var(--color-muted)", drop: true },
  ];

  const onEnd = (e: DragEndEvent) => {
    setDragId(null);
    const id = String(e.active.id);
    const lane = e.over?.id as string | undefined;
    if (!lane) return;
    if (lane === "today") updateTodo(id, { due: atFutureEvening(0) });
    else if (lane === "week") updateTodo(id, { due: atFutureEvening(3) });
    else if (lane === "later") updateTodo(id, { due: atFutureEvening(10) });
    else if (lane === "someday") updateTodo(id, { due: null });
  };

  const dragged = tasks.find((t) => t.id === dragId);
  return (
    <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDragId(null)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {lanes.map((lane) => {
          const items = tasks.filter((t) => horizon(t) === lane.key);
          const inner = (
            <div className="card h-full p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: lane.color }} />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{lane.label}</h3>
                <span className="text-xs text-muted">{items.length}</span>
              </div>
              <ul className="space-y-1">
                {items.map((t) => (
                  <DragTask key={t.id} t={t} />
                ))}
                {items.length === 0 && <li className="px-2 py-2 text-sm text-muted">—</li>}
              </ul>
            </div>
          );
          return lane.drop ? (
            <DropZone key={lane.key} id={lane.key}>
              {inner}
            </DropZone>
          ) : (
            <div key={lane.key}>{inner}</div>
          );
        })}
      </div>
      <DragOverlay>{dragged ? <div className="card px-3 py-2 text-ink shadow-[var(--shadow-float)]">{dragged.title}</div> : null}</DragOverlay>
    </DndContext>
  );
}

function Matrix({ tasks }: { tasks: StoredTodo[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useBoardSensors();
  const quads = [
    { key: "do", label: "Do first", sub: "Urgent · Important", color: "var(--color-accent)", f: (t: StoredTodo) => isImportant(t) && isUrgent(t) },
    { key: "plan", label: "Schedule", sub: "Important · Not urgent", color: "var(--color-event)", f: (t: StoredTodo) => isImportant(t) && !isUrgent(t) },
    { key: "quick", label: "Quick wins", sub: "Urgent · Not important", color: "var(--color-note)", f: (t: StoredTodo) => !isImportant(t) && isUrgent(t) },
    { key: "later", label: "Later", sub: "Neither", color: "var(--color-muted)", f: (t: StoredTodo) => !isImportant(t) && !isUrgent(t) },
  ];

  const onEnd = (e: DragEndEvent) => {
    setDragId(null);
    const id = String(e.active.id);
    const q = e.over?.id as string | undefined;
    if (!q) return;
    if (q === "do") updateTodo(id, { priority: "high", due: atFutureEvening(0) });
    else if (q === "plan") updateTodo(id, { priority: "high", due: atFutureEvening(7) });
    else if (q === "quick") updateTodo(id, { priority: "normal", due: atFutureEvening(0) });
    else if (q === "later") updateTodo(id, { priority: "low", due: null });
  };

  const dragged = tasks.find((t) => t.id === dragId);
  return (
    <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDragId(null)}>
      <div className="grid gap-4 sm:grid-cols-2">
        {quads.map((q) => {
          const items = tasks.filter(q.f);
          return (
            <DropZone key={q.key} id={q.key}>
              <div className="card h-full p-5" style={{ borderTop: `3px solid ${q.color}` }}>
                <div className="mb-3">
                  <h3 className="font-serif text-xl text-ink">{q.label}</h3>
                  <p className="text-xs uppercase tracking-wide text-muted">{q.sub}</p>
                </div>
                <ul className="space-y-1">
                  {items.map((t) => (
                    <DragTask key={t.id} t={t} />
                  ))}
                  {items.length === 0 && <li className="px-2 py-2 text-sm text-muted">—</li>}
                </ul>
              </div>
            </DropZone>
          );
        })}
      </div>
      <DragOverlay>{dragged ? <div className="card px-3 py-2 text-ink shadow-[var(--shadow-float)]">{dragged.title}</div> : null}</DragOverlay>
    </DndContext>
  );
}

function Kanban({ tasks }: { tasks: StoredTodo[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useBoardSensors();
  const cols = [
    { key: "todo", label: "To do", color: "var(--color-muted)", f: (t: StoredTodo) => !t.done && t.status !== "doing" },
    { key: "doing", label: "Doing", color: "var(--color-event)", f: (t: StoredTodo) => !t.done && t.status === "doing" },
    { key: "done", label: "Done", color: "var(--color-task)", f: (t: StoredTodo) => t.done },
  ];
  const onEnd = (e: DragEndEvent) => {
    setDragId(null);
    const id = String(e.active.id);
    const c = e.over?.id as string | undefined;
    if (c === "todo") updateTodo(id, { done: false, status: "todo" });
    else if (c === "doing") updateTodo(id, { done: false, status: "doing" });
    else if (c === "done") updateTodo(id, { done: true, status: "done" });
  };
  const dragged = tasks.find((t) => t.id === dragId);
  return (
    <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDragId(null)}>
      <div className="grid gap-4 sm:grid-cols-3">
        {cols.map((c) => {
          const items = tasks.filter(c.f);
          return (
            <DropZone key={c.key} id={c.key}>
              <div className="card h-full min-h-[320px] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{c.label}</h3>
                  <span className="text-xs text-muted">{items.length}</span>
                </div>
                <ul className="space-y-1">
                  {items.map((t) => (
                    <DragTask key={t.id} t={t} />
                  ))}
                  {items.length === 0 && <li className="px-2 py-2 text-sm text-muted">—</li>}
                </ul>
              </div>
            </DropZone>
          );
        })}
      </div>
      <DragOverlay>{dragged ? <div className="card px-3 py-2 text-ink shadow-[var(--shadow-float)]">{dragged.title}</div> : null}</DragOverlay>
    </DndContext>
  );
}

const CAL_START = 6;
const CAL_END = 23;
const HOUR_PX = 52;

function CalendarView({ events, tasks }: { events: StoredEvent[]; tasks: StoredTodo[] }) {
  const [offset, setOffset] = useState(0); // days from today
  const day = new Date();
  day.setDate(day.getDate() + offset);
  day.setHours(0, 0, 0, 0);
  const key = dayKey(day);
  const isToday = offset === 0;

  type Block = { id: string; title: string; start: Date; mins: number; kind: "event" | "task"; meta?: string };
  const blocks: Block[] = [];
  const untimed: { id: string; title: string; kind: "event" | "task" }[] = [];

  for (const e of events) {
    if (dayKey(e.start) !== key) continue;
    if (e.allDay) {
      untimed.push({ id: e.id, title: e.title, kind: "event" });
    } else {
      const s = new Date(e.start);
      const end = e.end ? new Date(e.end) : new Date(s.getTime() + 3600000);
      blocks.push({ id: e.id, title: e.title, start: s, mins: Math.max(30, (end.getTime() - s.getTime()) / 60000), kind: "event", meta: e.location ?? undefined });
    }
  }
  for (const t of tasks) {
    if (t.done || !t.due || dayKey(t.due) !== key) continue;
    const s = new Date(t.due);
    if (s.getHours() === 0 && s.getMinutes() === 0) untimed.push({ id: t.id, title: t.title, kind: "task" });
    else blocks.push({ id: t.id, title: t.title, start: s, mins: 30, kind: "task" });
  }

  const hours = Array.from({ length: CAL_END - CAL_START + 1 }, (_, i) => CAL_START + i);
  const topFor = (d: Date) => ((d.getHours() - CAL_START) * 60 + d.getMinutes()) / 60 * HOUR_PX;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setOffset((o) => o - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft hover:text-ink">
          <ArrowLeft size={16} />
        </button>
        <p className="font-serif text-2xl text-ink">
          {day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          {isToday && <span className="ml-2 align-middle text-sm not-italic text-accent">· Today</span>}
        </p>
        <button onClick={() => setOffset((o) => o + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft hover:text-ink rotate-180">
          <ArrowLeft size={16} />
        </button>
      </div>

      {untimed.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 border-b border-line pb-3">
          {untimed.map((u) => (
            <span key={u.id} className="rounded-full px-3 py-1 text-sm" style={{ background: u.kind === "event" ? "color-mix(in srgb, var(--color-event) 14%, transparent)" : "color-mix(in srgb, var(--color-task) 14%, transparent)", color: u.kind === "event" ? "var(--color-event)" : "var(--color-task)" }}>
              {u.title}
            </span>
          ))}
        </div>
      )}

      <div className="relative" style={{ height: hours.length * HOUR_PX }}>
        {hours.map((h, i) => (
          <div key={h} className="absolute left-0 right-0 flex items-start gap-3" style={{ top: i * HOUR_PX }}>
            <span className="w-12 shrink-0 text-right text-xs text-muted">{h % 12 === 0 ? 12 : h % 12}{h < 12 ? "am" : "pm"}</span>
            <div className="flex-1 border-t border-line" style={{ height: HOUR_PX }} />
          </div>
        ))}
        <div className="absolute left-16 right-0 top-0" style={{ height: hours.length * HOUR_PX }}>
          {blocks.map((b) => (
            <div
              key={b.id}
              className="absolute left-0 right-2 overflow-hidden rounded-lg px-2.5 py-1.5 text-xs"
              style={{
                top: topFor(b.start),
                height: Math.max(24, (b.mins / 60) * HOUR_PX - 4),
                background: b.kind === "event" ? "color-mix(in srgb, var(--color-event) 16%, transparent)" : "color-mix(in srgb, var(--color-task) 16%, transparent)",
                borderLeft: `3px solid ${b.kind === "event" ? "var(--color-event)" : "var(--color-task)"}`,
                color: b.kind === "event" ? "var(--color-event)" : "var(--color-task)",
              }}
            >
              <span className="flex items-center gap-1 font-medium">
                {b.kind === "event" ? <Clock size={11} /> : <Check size={11} />} {b.title}
              </span>
              {b.meta && <span className="flex items-center gap-1 opacity-80"><MapPin size={10} /> {b.meta}</span>}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted">Drag-to-reschedule + your Google events are coming next.</p>
    </div>
  );
}

function Focus({ tasks }: { tasks: StoredTodo[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs((s) => {
          if (s <= 1) {
            setRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p));

  const mm = Math.floor(secs / 60).toString().padStart(2, "0");
  const ss = (secs % 60).toString().padStart(2, "0");
  const pickedTasks = tasks.filter((t) => picked.includes(t.id));

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="card flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm uppercase tracking-wider text-muted">Focus session</p>
        <p className="my-4 font-serif text-8xl tabular-nums text-ink" style={{ color: secs === 0 ? "var(--color-accent)" : undefined }}>
          {mm}:{ss}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-white transition hover:brightness-105">
            {running ? <Pause size={18} /> : <Play size={18} />} {running ? "Pause" : "Start"}
          </button>
          <button onClick={() => { setRunning(false); setSecs(25 * 60); }} className="grid h-12 w-12 place-items-center rounded-full border border-line text-ink-soft transition hover:text-ink">
            <RotateCcw size={18} />
          </button>
        </div>
        <div className="mt-5 flex gap-2 text-sm text-muted">
          {[25, 15, 5].map((m) => (
            <button key={m} onClick={() => { setRunning(false); setSecs(m * 60); }} className="rounded-full border border-line px-3 py-1 transition hover:text-ink">
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-2xl text-ink">Your top 3 today</h3>
        <p className="mt-1 text-sm text-muted">Pick up to three. The rest can wait.</p>
        {pickedTasks.length > 0 && (
          <ul className="mt-4 space-y-2">
            {pickedTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3">
                <button onClick={() => toggleTodo(t.id)} className="grid h-5 w-5 place-items-center rounded-full border-2 border-task" aria-label="Complete" />
                <span className="text-ink">{t.title}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted">Choose from your tasks</p>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {tasks.map((t) => {
              const on = picked.includes(t.id);
              return (
                <li key={t.id}>
                  <button onClick={() => toggle(t.id)} disabled={!on && picked.length >= 3} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-surface-2 disabled:opacity-40">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-2" style={{ borderColor: on ? "var(--color-accent)" : "var(--color-line-strong)", background: on ? "var(--color-accent)" : "transparent" }}>
                      {on ? <Check size={12} className="text-white" strokeWidth={3} /> : <Plus size={12} className="text-muted" />}
                    </span>
                    <span className="text-ink">{t.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
