"use client";

import { useState } from "react";
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
import { ArrowLeft, ArrowRight, Check, GripVertical, Clock, Inbox } from "lucide-react";
import { useDB, toggleTodo, updateTodo, dayKey, snap15, type StoredTodo } from "@/lib/store";
import { fmtTime } from "@/lib/format";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function Task({ t }: { t: StoredTodo }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t.id });
  const timed = t.due && new Date(t.due).getHours() > 0;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined, opacity: isDragging ? 0.35 : 1, touchAction: "none" }}
      className="group flex items-start gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5"
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => toggleTodo(t.id)}
        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 border-line-strong transition hover:border-task"
        aria-label="Complete"
      >
        <Check size={9} className="text-task opacity-0 group-hover:opacity-50" strokeWidth={3} />
      </button>
      <span className="min-w-0 flex-1 text-xs text-ink">
        {timed && <span className="mr-1 text-task">{fmtTime(t.due!)}</span>}
        {t.title}
      </span>
      <button {...attributes} {...listeners} className="cursor-grab opacity-0 transition group-hover:opacity-100 active:cursor-grabbing" aria-label="Drag">
        <GripVertical size={13} className="text-muted" />
      </button>
    </div>
  );
}

function Drop({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className} style={{ outline: isOver ? "2px solid var(--color-accent)" : undefined, outlineOffset: 2, borderRadius: 12 }}>
      {children}
    </div>
  );
}

export default function WeekAgenda() {
  const db = useDB();
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  // Monday-start week
  const ws = startOfToday();
  ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7) + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    return d;
  });
  const todayKey = dayKey(new Date());

  const tasks = db.todos.filter((t) => !t.done && (!t.repeat || t.repeat === "none"));
  const unscheduled = tasks.filter((t) => !t.due);

  const onEnd = (e: DragEndEvent) => {
    setDragId(null);
    const id = String(e.active.id);
    const target = e.over?.id as string | undefined;
    if (!target) return;
    if (target === "unscheduled") {
      updateTodo(id, { due: null });
      return;
    }
    const t = db.todos.find((x) => x.id === id);
    const prev = t?.due ? new Date(t.due) : null;
    const [y, m, dd] = target.split("-").map(Number);
    const nd = new Date(y, m - 1, dd, prev && prev.getHours() > 0 ? prev.getHours() : 17, prev ? prev.getMinutes() : 0, 0, 0);
    updateTodo(id, { due: snap15(nd.toISOString()) });
  };
  const dragged = db.todos.find((t) => t.id === dragId);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-2xl text-ink">Your week</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((o) => o - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-soft hover:text-ink"><ArrowLeft size={15} /></button>
          <span className="min-w-28 text-center text-sm text-muted">
            {weekOffset === 0 ? "This week" : `${days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          </span>
          <button onClick={() => setWeekOffset((o) => o + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-soft hover:text-ink"><ArrowRight size={15} /></button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDragId(null)}>
        {/* unscheduled backlog — drag onto a day to time-block it */}
        <Drop id="unscheduled" className="mb-4">
          <div className="rounded-xl border border-dashed border-line-strong p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
              <Inbox size={13} /> Unscheduled · drag onto a day
            </p>
            {unscheduled.length ? (
              <div className="flex flex-wrap gap-2">
                {unscheduled.map((t) => (
                  <div key={t.id} className="w-48">
                    <Task t={t} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Everything's scheduled. 🎯</p>
            )}
          </div>
        </Drop>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((d) => {
            const k = dayKey(d);
            const isToday = k === todayKey;
            const past = d < startOfToday();
            const dayEvents = db.events.filter((e) => dayKey(e.start) === k);
            const dayTasks = tasks.filter((t) => t.due && dayKey(t.due) === k);
            return (
              <Drop key={k} id={k}>
                <div className="card h-full min-h-[150px] p-2.5" style={{ borderColor: isToday ? "var(--color-accent)" : undefined, opacity: past ? 0.6 : 1 }}>
                  <div className="mb-2 flex items-baseline gap-1.5">
                    <span className="text-[11px] uppercase tracking-wide text-muted">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                    <span className="font-serif text-lg leading-none" style={{ color: isToday ? "var(--color-accent)" : "var(--color-ink)" }}>{d.getDate()}</span>
                  </div>
                  <div className="space-y-1.5">
                    {dayEvents.map((e) => (
                      <div key={e.id} className="rounded-lg border-l-2 px-2 py-1 text-xs" style={{ borderColor: "var(--color-event)", background: "color-mix(in srgb, var(--color-event) 10%, transparent)", color: "var(--color-event)" }}>
                        <span className="flex items-center gap-1"><Clock size={9} /> {e.allDay ? "All day" : fmtTime(e.start)}</span>
                        <span className="text-ink-soft">{e.title}</span>
                      </div>
                    ))}
                    {dayTasks.map((t) => <Task key={t.id} t={t} />)}
                  </div>
                </div>
              </Drop>
            );
          })}
        </div>
        <DragOverlay>{dragged ? <div className="card px-3 py-2 text-sm text-ink shadow-[var(--shadow-float)]">{dragged.title}</div> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
