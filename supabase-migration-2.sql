-- ────────────────────────────────────────────────────────────
-- yapload migration #2 — habits / recurring tasks
-- Run this in Supabase → SQL Editor.
-- ────────────────────────────────────────────────────────────

alter table public.todos add column if not exists repeat text not null default 'none'; -- none | daily | weekly
alter table public.todos add column if not exists streak integer not null default 0;
