"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { addTodo, addNote, addEvent } from "@/lib/store";

const PRIOS = [
  { key: "low" as const, label: "Low", color: "var(--color-muted)" },
  { key: "normal" as const, label: "Normal", color: "var(--color-task)" },
  { key: "high" as const, label: "Urgent", color: "var(--color-accent)" },
];

/** Quick-add a task — type + Enter, or expand for date & importance. */
export function QuickAddTask() {
  const [v, setV] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [open, setOpen] = useState(false);

  const submit = () => {
    if (!v.trim()) return;
    addTodo(v, due || null, priority);
    setV("");
    setDue("");
    setPriority("normal");
    setOpen(false);
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-line-strong text-muted">
          <Plus size={13} />
        </span>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a task…"
          className="flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted"
        />
        {v.trim() && (
          <button
            onClick={submit}
            className="rounded-full bg-accent px-4 py-1.5 text-sm text-white transition hover:brightness-105"
          >
            Add
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pl-9 pt-3">
          <div className="flex items-center gap-1.5">
            {PRIOS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPriority(p.key)}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition"
                style={{
                  borderColor: priority === p.key ? p.color : "var(--color-line)",
                  color: priority === p.key ? p.color : "var(--color-muted)",
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink outline-none"
          />
        </div>
      )}
    </div>
  );
}

/** Collapsed "+ New note" that expands into a title + body composer. */
export function NoteComposer() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const save = () => {
    addNote(title, body);
    setTitle("");
    setBody("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card card-hover flex w-full items-center gap-2 p-4 text-left text-muted transition hover:text-ink"
      >
        <Plus size={17} className="text-accent" /> New note
      </button>
    );
  }
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="flex-1 bg-transparent font-serif text-xl text-ink outline-none placeholder:text-muted"
        />
        <button onClick={() => setOpen(false)}>
          <X size={16} className="text-muted hover:text-accent" />
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write it down…"
        className="w-full resize-none bg-transparent leading-relaxed text-ink-soft outline-none placeholder:text-muted"
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={save}
          className="rounded-full bg-accent px-5 py-2 text-sm text-white transition hover:brightness-105"
        >
          Save note
        </button>
      </div>
    </div>
  );
}

/** Collapsed "+ Add event" that expands into title + datetime. */
export function EventComposer() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");

  const save = () => {
    if (!title.trim() || !when) return;
    const d = new Date(when);
    if (isNaN(d.getTime())) return;
    addEvent(title, d.toISOString());
    setTitle("");
    setWhen("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card card-hover flex w-full items-center gap-2 p-4 text-left text-muted transition hover:text-ink"
      >
        <Plus size={17} className="text-accent" /> Add event
      </button>
    );
  }
  return (
    <div className="card flex flex-wrap items-center gap-3 p-5">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Event name"
        className="min-w-40 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted"
      />
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink outline-none"
      />
      <button
        onClick={save}
        className="rounded-full bg-accent px-5 py-2 text-sm text-white transition hover:brightness-105"
      >
        Add
      </button>
      <button onClick={() => setOpen(false)} className="text-muted hover:text-accent">
        <X size={18} />
      </button>
    </div>
  );
}
