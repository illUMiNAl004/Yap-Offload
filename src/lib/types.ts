import { z } from "zod";

/**
 * The shape the AI sorts a brain-dump into.
 * Kept deliberately small + human — these are the things you'd tell a friend.
 */

export const TodoSchema = z.object({
  title: z.string(),
  // ISO date (YYYY-MM-DD) or full ISO datetime; null when no time was mentioned
  due: z.string().nullable().default(null),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  // recurring tasks become "habits"
  repeat: z.enum(["none", "daily", "weekly"]).default("none"),
  // when true (no fixed time given), yapload finds a free slot in the schedule
  autoSchedule: z.boolean().optional(),
  // rough length for auto-scheduling, in minutes
  durationMin: z.number().optional(),
});

export const EventSchema = z.object({
  title: z.string(),
  // ISO datetime for the start; required for an event to be an event
  start: z.string(),
  end: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  allDay: z.boolean().default(false),
});

export const NoteSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export const SortResultSchema = z.object({
  // A cleaned-up, well-written narrative of the day in the user's voice.
  journal: z.string().default(""),
  // The "things worth remembering" list distilled from the dump.
  highlights: z.array(z.string()).default([]),
  todos: z.array(TodoSchema).default([]),
  events: z.array(EventSchema).default([]),
  notes: z.array(NoteSchema).default([]),
});

export type Todo = z.infer<typeof TodoSchema>;
export type CalEvent = z.infer<typeof EventSchema>;
export type Note = z.infer<typeof NoteSchema>;
export type SortResult = z.infer<typeof SortResultSchema>;

export const BUCKETS = ["journal", "highlights", "todos", "events", "notes"] as const;
export type Bucket = (typeof BUCKETS)[number];
