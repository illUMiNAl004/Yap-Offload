"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  StickyNote,
  X,
  ArrowRight,
  MapPin,
} from "lucide-react";
import type { SortResult, Todo, CalEvent, Note } from "@/lib/types";

type Props = {
  initial: SortResult;
  mock: boolean;
  transcript: string;
  onConfirm: (result: SortResult) => void;
  onDiscard: () => void;
  saving: boolean;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toISOString();
}

function SectionHead({
  icon,
  label,
  color,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: color }}>
        {icon}
      </span>
      <h3 className="font-sans text-base font-semibold text-ink">{label}</h3>
      {count !== undefined && count > 0 && <span className="text-sm text-muted">· {count}</span>}
    </div>
  );
}

const priorities: Todo["priority"][] = ["low", "normal", "high"];
const prioColor: Record<Todo["priority"], string> = {
  low: "var(--color-muted)",
  normal: "var(--color-task)",
  high: "var(--color-accent)",
};

const Card = ({ children, i }: { children: React.ReactNode; i: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="card p-6"
  >
    {children}
  </motion.div>
);

export default function Review({
  initial,
  mock,
  transcript,
  onConfirm,
  onDiscard,
  saving,
}: Props) {
  const [r, setR] = useState<SortResult>(initial);
  const [showTranscript, setShowTranscript] = useState(false);

  const set = <K extends keyof SortResult>(k: K, v: SortResult[K]) =>
    setR((prev) => ({ ...prev, [k]: v }));

  const isEmpty =
    !r.journal &&
    r.highlights.length === 0 &&
    r.todos.length === 0 &&
    r.events.length === 0 &&
    r.notes.length === 0;

  let idx = 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-40 pt-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-9 text-center"
      >
        <p className="font-serif text-5xl tracking-tight text-ink">
          Your day, <span className="text-spectrum italic">sorted</span>.
        </p>
        <p className="mt-2 text-muted">Tweak anything that&apos;s off, then keep it.</p>
        {mock && (
          <p className="mt-4 inline-block rounded-full border border-note/30 bg-note/10 px-3 py-1 text-sm text-note">
            Demo data — add a Groq key to sort your real voice
          </p>
        )}
      </motion.div>

      <button
        onClick={() => setShowTranscript((s) => !s)}
        className="mb-5 text-sm text-muted underline-offset-4 transition hover:text-ink-soft hover:underline"
      >
        {showTranscript ? "Hide" : "Show"} what you said
      </button>
      <AnimatePresence>
        {showTranscript && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-xl border border-line bg-surface-2 p-4 text-sm italic leading-relaxed text-ink-soft"
          >
            &ldquo;{transcript}&rdquo;
          </motion.p>
        )}
      </AnimatePresence>

      {/* Journal full-width, then areas flow as a masonry */}
      {(r.journal || !isEmpty) && (
        <div className="mb-5">
          <Card i={idx++}>
            <SectionHead
              icon={<BookOpen size={15} className="text-white" />}
              label="Journal"
              color="var(--color-journal)"
            />
            <textarea
              value={r.journal}
              onChange={(e) => set("journal", e.target.value)}
              rows={5}
              placeholder="Nothing reflective today — that's okay."
              className="w-full resize-none bg-transparent font-serif text-xl leading-relaxed text-ink-soft outline-none placeholder:text-muted/60"
            />
          </Card>
        </div>
      )}

      <div className="gap-5 sm:columns-2 [&>*]:mb-5 [&>*]:break-inside-avoid">
        {r.highlights.length > 0 && (
          <Card i={idx++}>
            <SectionHead
              icon={<Sparkles size={14} className="text-white" />}
              label="Worth remembering"
              color="var(--color-accent)"
              count={r.highlights.length}
            />
            <ul className="space-y-2.5">
              {r.highlights.map((h, i) => (
                <li key={i} className="group flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <input
                    value={h}
                    onChange={(e) => {
                      const next = [...r.highlights];
                      next[i] = e.target.value;
                      set("highlights", next);
                    }}
                    className="flex-1 bg-transparent text-ink-soft outline-none"
                  />
                  <button
                    onClick={() => set("highlights", r.highlights.filter((_, j) => j !== i))}
                    className="opacity-0 transition group-hover:opacity-100"
                  >
                    <X size={15} className="text-muted hover:text-accent" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {r.todos.length > 0 && (
          <Card i={idx++}>
            <SectionHead
              icon={<CheckCircle2 size={14} className="text-white" />}
              label="To do"
              color="var(--color-task)"
              count={r.todos.length}
            />
            <ul className="space-y-3.5">
              {r.todos.map((t, i) => {
                const update = (patch: Partial<Todo>) => {
                  const next = [...r.todos];
                  next[i] = { ...t, ...patch };
                  set("todos", next);
                };
                return (
                  <li key={i} className="group flex items-center gap-3">
                    <button
                      onClick={() => {
                        const order = priorities.indexOf(t.priority);
                        update({ priority: priorities[(order + 1) % 3] });
                      }}
                      title={`Priority: ${t.priority}`}
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: prioColor[t.priority] }}
                    />
                    <input
                      value={t.title}
                      onChange={(e) => update({ title: e.target.value })}
                      className="flex-1 bg-transparent text-ink outline-none"
                    />
                    <input
                      type="date"
                      value={t.due ? t.due.slice(0, 10) : ""}
                      onChange={(e) => update({ due: e.target.value || null })}
                      className="rounded-lg border border-task/25 bg-task/10 px-2 py-1 text-xs text-task outline-none"
                    />
                    <button
                      onClick={() => set("todos", r.todos.filter((_, j) => j !== i))}
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <X size={15} className="text-muted hover:text-accent" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {r.events.length > 0 && (
          <Card i={idx++}>
            <SectionHead
              icon={<CalendarDays size={14} className="text-white" />}
              label="On the calendar"
              color="var(--color-event)"
              count={r.events.length}
            />
            <ul className="space-y-3">
              {r.events.map((ev, i) => {
                const update = (patch: Partial<CalEvent>) => {
                  const next = [...r.events];
                  next[i] = { ...ev, ...patch };
                  set("events", next);
                };
                return (
                  <li key={i} className="group rounded-xl border border-event/20 bg-event/[0.07] p-3.5">
                    <div className="flex items-center gap-2">
                      <input
                        value={ev.title}
                        onChange={(e) => update({ title: e.target.value })}
                        className="flex-1 bg-transparent font-medium text-ink outline-none"
                      />
                      <button
                        onClick={() => set("events", r.events.filter((_, j) => j !== i))}
                        className="opacity-0 transition group-hover:opacity-100"
                      >
                        <X size={15} className="text-muted hover:text-accent" />
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-event">
                      <input
                        type="datetime-local"
                        value={toLocalInput(ev.start)}
                        onChange={(e) => update({ start: fromLocalInput(e.target.value) })}
                        className="rounded-lg border border-event/20 bg-surface-2 px-2 py-1 outline-none"
                      />
                      <span className="flex items-center gap-1">
                        <MapPin size={13} />
                        <input
                          value={ev.location ?? ""}
                          placeholder="add place"
                          onChange={(e) => update({ location: e.target.value || null })}
                          className="w-28 bg-transparent outline-none placeholder:text-event/50"
                        />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {r.notes.length > 0 && (
          <Card i={idx++}>
            <SectionHead
              icon={<StickyNote size={14} className="text-white" />}
              label="Notes"
              color="var(--color-note)"
              count={r.notes.length}
            />
            <ul className="space-y-4">
              {r.notes.map((n, i) => {
                const update = (patch: Partial<Note>) => {
                  const next = [...r.notes];
                  next[i] = { ...n, ...patch };
                  set("notes", next);
                };
                return (
                  <li key={i} className="group">
                    <div className="flex items-center gap-2">
                      <input
                        value={n.title}
                        onChange={(e) => update({ title: e.target.value })}
                        className="flex-1 bg-transparent font-medium text-ink outline-none"
                      />
                      <button
                        onClick={() => set("notes", r.notes.filter((_, j) => j !== i))}
                        className="opacity-0 transition group-hover:opacity-100"
                      >
                        <X size={15} className="text-muted hover:text-accent" />
                      </button>
                    </div>
                    <textarea
                      value={n.body}
                      onChange={(e) => update({ body: e.target.value })}
                      rows={2}
                      className="mt-1 w-full resize-none bg-transparent text-sm leading-relaxed text-ink-soft outline-none"
                    />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {isEmpty && (
        <p className="py-10 text-center text-muted">
          Hmm, I didn&apos;t catch anything to sort. Want to try again?
        </p>
      )}

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-4xl px-5 pb-5">
          <div className="card flex items-center justify-between gap-4 rounded-full px-5 py-3 shadow-[var(--shadow-float)]">
            <button
              onClick={onDiscard}
              disabled={saving}
              className="px-3 text-muted transition hover:text-ink disabled:opacity-40"
            >
              Discard
            </button>
            <button
              onClick={() => onConfirm(r)}
              disabled={saving || isEmpty}
              className="flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-white transition hover:gap-3 disabled:opacity-40"
            >
              {saving ? "Keeping…" : "Keep it all"}
              {!saving && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
