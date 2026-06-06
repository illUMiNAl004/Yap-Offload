"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { SortResult, Todo, CalEvent, Note } from "./types";

/**
 * Cloud store, backed by Supabase (row-level-security scoped to the signed-in
 * user). The public API matches the old local store, so pages didn't change:
 * mutations fire-and-forget, then broadcast a change so useDB refetches.
 */

export type JournalEntry = {
  id: string;
  createdAt: string;
  body: string;
  highlights: string[];
  transcript: string;
};
export type Repeat = "none" | "daily" | "weekly";
export type Status = "todo" | "doing" | "done";
export type StoredTodo = Todo & {
  id: string;
  createdAt: string;
  done: boolean;
  repeat: Repeat;
  streak: number;
  status: Status;
  completedAt: string | null;
  history: string[];
};
export type StoredEvent = CalEvent & { id: string; createdAt: string };
export type StoredNote = Note & { id: string; createdAt: string };

export type DB = {
  journal: JournalEntry[];
  todos: StoredTodo[];
  events: StoredEvent[];
  notes: StoredNote[];
  photos: Record<string, string>; // dayKey -> public URL
};

const EVT = "yoffload:change";
const BUCKET = "day-photos";
const empty = (): DB => ({ journal: [], todos: [], events: [], notes: [], photos: {} });

function broadcast() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

export function dayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Round a time to the nearest 15-minute window (keeps the calendar tidy). */
export function snap15(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setMinutes(Math.round(d.getMinutes() / 15) * 15, 0, 0);
  return d.toISOString();
}

/** Next free 15-min-aligned slot of `durationMin` within work hours (9–21), avoiding `busy`. */
function findFreeSlot(busy: { start: number; end: number }[], durationMin: number, fromMs: number): string {
  const STEP = 15 * 60000;
  const dur = Math.max(15, durationMin) * 60000;
  const WORK_START = 9;
  const WORK_END = 21;
  let t = Math.ceil(fromMs / STEP) * STEP;
  for (let i = 0; i < 14 * 24 * 4; i++, t += STEP) {
    const s = new Date(t);
    const e = new Date(t + dur);
    if (s.getHours() + s.getMinutes() / 60 < WORK_START) continue;
    if (e.getDate() !== s.getDate() || e.getHours() + e.getMinutes() / 60 > WORK_END) continue;
    if (!busy.some((b) => t < b.end && t + dur > b.start)) return new Date(t).toISOString();
  }
  return new Date(fromMs + 3600000).toISOString();
}

// ── reads ──────────────────────────────────────────────────
async function fetchAll(): Promise<DB> {
  if (!supabase) return empty();
  const [j, t, e, n, p] = await Promise.all([
    supabase.from("journal").select("*").order("created_at", { ascending: false }),
    supabase.from("todos").select("*").order("created_at", { ascending: false }),
    supabase.from("events").select("*").order("starts_at", { ascending: true }),
    supabase.from("notes").select("*").order("created_at", { ascending: false }),
    supabase.from("day_photos").select("*"),
  ]);

  const photos: Record<string, string> = {};
  for (const row of p.data ?? []) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(row.path);
    photos[row.day] = data.publicUrl;
  }

  return {
    journal: (j.data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      body: r.body ?? "",
      highlights: Array.isArray(r.highlights) ? r.highlights : [],
      transcript: r.transcript ?? "",
    })),
    todos: (t.data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      title: r.title,
      due: r.due ?? null,
      priority: r.priority ?? "normal",
      done: !!r.done,
      repeat: (r.repeat ?? "none") as Repeat,
      streak: r.streak ?? 0,
      status: (r.status ?? (r.done ? "done" : "todo")) as Status,
      completedAt: r.completed_at ?? null,
      history: Array.isArray(r.history) ? r.history : [],
    })),
    events: (e.data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      title: r.title,
      start: r.starts_at,
      end: r.ends_at ?? null,
      location: r.location ?? null,
      allDay: !!r.all_day,
    })),
    notes: (n.data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      title: r.title ?? "",
      body: r.body ?? "",
    })),
    photos,
  };
}

// ── writes ─────────────────────────────────────────────────
export async function saveSortResult(r: SortResult, transcript: string, nowISO: string) {
  if (!supabase) return { ok: true, errors: [] as string[] };
  const errors: string[] = [];
  const run = async (label: string, p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p;
    if (error) errors.push(`${label}: ${error.message}`);
  };

  // auto-schedule "whenever I have time" todos into free slots around real events
  const busy: { start: number; end: number }[] = [];
  if (r.todos.some((t) => t.autoSchedule && !t.due)) {
    const { data: evs } = await supabase.from("events").select("starts_at, ends_at");
    for (const e of evs ?? []) {
      const s = new Date(e.starts_at).getTime();
      busy.push({ start: s, end: e.ends_at ? new Date(e.ends_at).getTime() : s + 3600000 });
    }
    for (const e of r.events) {
      const s = new Date(e.start).getTime();
      busy.push({ start: s, end: e.end ? new Date(e.end).getTime() : s + 3600000 });
    }
  }
  const todoRows = r.todos.map((t) => {
    let due = snap15(t.due);
    if (t.autoSchedule) {
      // start searching from now, or from the hinted day if one was given
      const fromMs = due ? Math.max(Date.now(), new Date(due).getTime()) : Date.now();
      const dur = t.durationMin ?? 30;
      due = findFreeSlot(busy, dur, fromMs);
      busy.push({ start: new Date(due).getTime(), end: new Date(due).getTime() + dur * 60000 });
    }
    return { created_at: nowISO, title: t.title, due, priority: t.priority, done: false, repeat: t.repeat ?? "none" };
  });

  const jobs: Promise<void>[] = [];
  if (r.journal.trim() || r.highlights.length) {
    jobs.push(run("journal", supabase.from("journal").insert({
      created_at: nowISO, day: dayKey(nowISO), body: r.journal, highlights: r.highlights, transcript,
    })));
  }
  if (todoRows.length) {
    jobs.push(run("todos", supabase.from("todos").insert(todoRows)));
  }
  if (r.events.length) {
    jobs.push(run("events", supabase.from("events").insert(
      r.events.map((e) => ({ created_at: nowISO, title: e.title, starts_at: snap15(e.start), ends_at: snap15(e.end), location: e.location, all_day: e.allDay })),
    )));
  }
  if (r.notes.length) {
    jobs.push(run("notes", supabase.from("notes").insert(
      r.notes.map((n) => ({ created_at: nowISO, title: n.title, body: n.body })),
    )));
  }

  await Promise.all(jobs);
  if (errors.length) console.error("yapload: some items failed to save —", errors);
  broadcast();
  return { ok: errors.length === 0, errors };
}

/**
 * Resolve "auto-schedule" todos into concrete free slots BEFORE the review,
 * so the proposed time shows up and the user can tweak it. Clears the flag.
 */
export async function fillAutoSchedule(r: SortResult): Promise<SortResult> {
  if (!supabase || !r.todos.some((t) => t.autoSchedule)) return r;
  const { data: evs } = await supabase.from("events").select("starts_at, ends_at");
  const busy: { start: number; end: number }[] = (evs ?? []).map((e) => ({
    start: new Date(e.starts_at).getTime(),
    end: e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 3600000,
  }));
  for (const e of r.events) {
    const s = new Date(e.start).getTime();
    busy.push({ start: s, end: e.end ? new Date(e.end).getTime() : s + 3600000 });
  }
  const todos = r.todos.map((t) => {
    if (!t.autoSchedule) return t;
    const fromMs = t.due ? Math.max(Date.now(), new Date(t.due).getTime()) : Date.now();
    const dur = t.durationMin ?? 30;
    const due = findFreeSlot(busy, dur, fromMs);
    busy.push({ start: new Date(due).getTime(), end: new Date(due).getTime() + dur * 60000 });
    return { ...t, due, autoSchedule: false };
  });
  return { ...r, todos };
}

export async function addTodo(
  title: string,
  due: string | null = null,
  priority: Todo["priority"] = "normal",
  repeat: Repeat = "none",
) {
  if (!supabase || !title.trim()) return;
  const dueISO = snap15(due);
  await supabase
    .from("todos")
    .insert({ title: title.trim(), due: dueISO, priority, done: false, repeat });
  broadcast();
}

/** Complete one occurrence of a recurring task: bump its due + streak, keep it active. */
export async function tickHabit(id: string) {
  if (!supabase) return;
  const { data } = await supabase.from("todos").select("due, repeat, streak, history").eq("id", id).single();
  if (!data) return;
  const base = data.due && new Date(data.due) > new Date() ? new Date(data.due) : new Date();
  base.setDate(base.getDate() + (data.repeat === "weekly" ? 7 : 1));
  const today = dayKey(new Date());
  const history = Array.isArray(data.history) ? data.history : [];
  if (!history.includes(today)) history.push(today);
  await supabase
    .from("todos")
    .update({ due: base.toISOString(), streak: (data.streak ?? 0) + 1, done: false, history })
    .eq("id", id);
  broadcast();
}

/** Wipe every row + photo for the signed-in user. Irreversible. */
export async function clearAllData() {
  if (!supabase) return;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return;
  await Promise.all([
    supabase.from("journal").delete().eq("user_id", uid),
    supabase.from("todos").delete().eq("user_id", uid),
    supabase.from("events").delete().eq("user_id", uid),
    supabase.from("notes").delete().eq("user_id", uid),
    supabase.from("day_photos").delete().eq("user_id", uid),
  ]);
  const { data: files } = await supabase.storage.from(BUCKET).list(uid);
  if (files?.length) {
    await supabase.storage.from(BUCKET).remove(files.map((f) => `${uid}/${f.name}`));
  }
  broadcast();
}

/** Urgency rank for sorting: higher = more urgent. */
export function urgency(t: StoredTodo): number {
  const prio = t.priority === "high" ? 2 : t.priority === "low" ? 0 : 1;
  // overdue/sooner due dates raise urgency
  let dueBoost = 0;
  if (t.due) {
    const days = (new Date(t.due).getTime() - Date.now()) / 86400000;
    dueBoost = days <= 0 ? 3 : days <= 1 ? 2.5 : days <= 3 ? 2 : days <= 7 ? 1 : 0.5;
  }
  return prio + dueBoost;
}

export async function addNote(title: string, body: string) {
  if (!supabase || (!title.trim() && !body.trim())) return;
  await supabase.from("notes").insert({ title: title.trim() || "Untitled", body: body.trim() });
  broadcast();
}

export async function addEvent(title: string, startISO: string, allDay = false) {
  if (!supabase || !title.trim() || !startISO) return;
  await supabase.from("events").insert({ title: title.trim(), starts_at: snap15(startISO), all_day: allDay });
  broadcast();
}

export async function toggleTodo(id: string) {
  if (!supabase) return;
  const { data } = await supabase.from("todos").select("done").eq("id", id).single();
  const nowDone = !data?.done;
  await supabase
    .from("todos")
    .update({
      done: nowDone,
      status: nowDone ? "done" : "todo",
      completed_at: nowDone ? new Date().toISOString() : null,
    })
    .eq("id", id);
  broadcast();
}

/** Edit any field of a todo in place. */
export async function updateTodo(
  id: string,
  patch: Partial<{ title: string; due: string | null; priority: Todo["priority"]; done: boolean; repeat: Repeat; status: Status }>,
) {
  if (!supabase) return;
  const p: Record<string, unknown> = { ...patch };
  if ("due" in p) p.due = snap15(p.due as string);
  if ("title" in p && typeof p.title === "string") p.title = p.title.trim();
  await supabase.from("todos").update(p).eq("id", id);
  broadcast();
}

export async function remove(kind: "todos" | "events" | "notes" | "journal", id: string) {
  if (!supabase) return;
  await supabase.from(kind).delete().eq("id", id);
  broadcast();
}

/** Set or clear the cover photo for a day. Accepts a JPEG data URL (or null). */
export async function setPhoto(key: string, dataUrl: string | null) {
  if (!supabase) return;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return;
  const path = `${uid}/${key}.jpg`;

  if (dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: "image/jpeg",
    });
    await supabase.from("day_photos").upsert({ day: key, path });
  } else {
    await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from("day_photos").delete().eq("day", key);
  }
  broadcast();
}

// ── derived ────────────────────────────────────────────────
export function journalStreak(db: DB): number {
  if (!db.journal.length) return 0;
  const days = new Set(db.journal.map((j) => dayKey(j.createdAt)));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── reactive hook ──────────────────────────────────────────
export function useDB(): DB {
  const [db, setDB] = useState<DB>(empty);
  const refresh = useCallback(() => {
    fetchAll().then(setDB).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(EVT, refresh);
    const sub = supabase?.auth.onAuthStateChange(() => refresh());
    return () => {
      window.removeEventListener(EVT, refresh);
      sub?.data.subscription.unsubscribe();
    };
  }, [refresh]);

  return db;
}
