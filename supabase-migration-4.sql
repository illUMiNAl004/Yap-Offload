-- ────────────────────────────────────────────────────────────
-- yapload migration #4 — activity heatmap data
-- Run this in Supabase → SQL Editor.
-- ────────────────────────────────────────────────────────────

-- when a task was completed (for the contribution heatmap)
alter table public.todos add column if not exists completed_at timestamptz;
-- per-day tick log for recurring habits (array of YYYY-MM-DD strings)
alter table public.todos add column if not exists history jsonb not null default '[]'::jsonb;
