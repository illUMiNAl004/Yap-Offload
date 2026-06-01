-- ────────────────────────────────────────────────────────────
-- yapload migration #3 — Kanban status
-- Run this in Supabase → SQL Editor.
-- ────────────────────────────────────────────────────────────

alter table public.todos add column if not exists status text not null default 'todo'; -- todo | doing | done
