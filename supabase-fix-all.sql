-- ════════════════════════════════════════════════════════════
-- yapload — ONE migration that brings any older DB fully up to date.
-- Safe to run multiple times (everything is "if not exists").
-- Supabase → SQL Editor → New query → paste → Run.
-- ════════════════════════════════════════════════════════════

-- tasks: time-of-day due, recurrence, kanban status, streak, completion log
alter table public.todos alter column due type timestamptz using due::timestamptz;
alter table public.todos add column if not exists repeat       text not null default 'none';
alter table public.todos add column if not exists streak       integer not null default 0;
alter table public.todos add column if not exists status       text not null default 'todo';
alter table public.todos add column if not exists completed_at timestamptz;
alter table public.todos add column if not exists history      jsonb not null default '[]'::jsonb;

-- google connection (Calendar/Tasks auto-sync)
create table if not exists public.google_connections (
  user_id       uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);
alter table public.google_connections enable row level security;
drop policy if exists own_rows on public.google_connections;
create policy own_rows on public.google_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
