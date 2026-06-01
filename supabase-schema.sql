-- ────────────────────────────────────────────────────────────
-- yoffload schema
-- Run this in Supabase → SQL Editor → New query → Run.
-- Every row is owned by a user; row-level security keeps it private.
-- ────────────────────────────────────────────────────────────

-- JOURNAL ------------------------------------------------------
create table if not exists public.journal (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  day         date not null default (now() at time zone 'utc')::date,
  body        text not null default '',
  highlights  jsonb not null default '[]'::jsonb,
  transcript  text not null default ''
);

-- TODOS --------------------------------------------------------
create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  due         timestamptz,
  priority    text not null default 'normal',
  done        boolean not null default false
);

-- EVENTS -------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  location    text,
  all_day     boolean not null default false
);

-- NOTES --------------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  title       text not null default '',
  body        text not null default ''
);

-- DAY PHOTOS (one cover photo per day) -------------------------
create table if not exists public.day_photos (
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  day         date not null,
  path        text not null,            -- storage path in the 'day-photos' bucket
  created_at  timestamptz not null default now(),
  primary key (user_id, day)
);

-- GOOGLE CONNECTION (stored refresh token for Calendar/Tasks sync) -------
create table if not exists public.google_connections (
  user_id     uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  refresh_token text not null,
  updated_at  timestamptz not null default now()
);

-- ROW LEVEL SECURITY ------------------------------------------
alter table public.journal             enable row level security;
alter table public.todos               enable row level security;
alter table public.events              enable row level security;
alter table public.notes               enable row level security;
alter table public.day_photos          enable row level security;
alter table public.google_connections  enable row level security;

-- "owners do anything to their own rows" for each table
do $$
declare t text;
begin
  foreach t in array array['journal','todos','events','notes','day_photos','google_connections']
  loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I
         for all
         using (user_id = auth.uid())
         with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- helpful indexes
create index if not exists journal_user_day_idx on public.journal (user_id, day desc);
create index if not exists todos_user_idx       on public.todos (user_id, created_at desc);
create index if not exists events_user_start_idx on public.events (user_id, starts_at);
create index if not exists notes_user_idx        on public.notes (user_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- STORAGE: a bucket for day cover photos
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('day-photos', 'day-photos', true)
on conflict (id) do nothing;

-- users can read/write only their own folder (path begins with their uid)
drop policy if exists "day-photos read"   on storage.objects;
drop policy if exists "day-photos write"  on storage.objects;
drop policy if exists "day-photos update" on storage.objects;
drop policy if exists "day-photos delete" on storage.objects;

create policy "day-photos read" on storage.objects
  for select using (bucket_id = 'day-photos');

create policy "day-photos write" on storage.objects
  for insert with check (
    bucket_id = 'day-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "day-photos update" on storage.objects
  for update using (
    bucket_id = 'day-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "day-photos delete" on storage.objects
  for delete using (
    bucket_id = 'day-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
