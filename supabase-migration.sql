-- ────────────────────────────────────────────────────────────
-- yapload migration — run this in Supabase → SQL Editor
-- (you already ran the base schema; this adds the new bits)
-- ────────────────────────────────────────────────────────────

-- 1) Tasks can now carry a time, not just a date
alter table public.todos
  alter column due type timestamptz using due::timestamptz;

-- 2) Store the Google refresh token for robust Calendar/Tasks auto-sync
create table if not exists public.google_connections (
  user_id       uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);

alter table public.google_connections enable row level security;
drop policy if exists own_rows on public.google_connections;
create policy own_rows on public.google_connections
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
