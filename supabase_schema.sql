-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────
-- 1. Tasks
-- ──────────────────────────────────────────────────────
create table if not exists public.tasks (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  title text,
  priority text,
  hours text,
  status text,
  project text,
  due text,
  labels jsonb,
  reminders jsonb,
  subtasks jsonb,
  parent_id text,
  dependencies jsonb,
  recurring jsonb,
  time_spent double precision,
  notes text,
  attachments jsonb,
  description text,
  start_date text,
  estimated_duration double precision,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tasks enable row level security;
drop policy if exists "Users can all access their own tasks" on public.tasks;
create policy "Users can all access their own tasks" on public.tasks for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 2. Notes
-- ──────────────────────────────────────────────────────
create table if not exists public.notes (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  date text,
  title text,
  preview text,
  content text,
  tags jsonb,
  last_edited text,
  file_path text,
  last_synced text,
  created_at timestamptz default now()
);
alter table public.notes enable row level security;
drop policy if exists "Users can all access their own notes" on public.notes;
create policy "Users can all access their own notes" on public.notes for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 3. Planning Items
-- ──────────────────────────────────────────────────────
create table if not exists public.planning_items (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  title text,
  tag text,
  stage text,
  active boolean,
  created_at timestamptz default now()
);
alter table public.planning_items enable row level security;
drop policy if exists "Users can all access their own planning items" on public.planning_items;
create policy "Users can all access their own planning items" on public.planning_items for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 4. Activities
-- ──────────────────────────────────────────────────────
create table if not exists public.activities (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  text text,
  time text,
  type text,
  created_at timestamptz default now()
);
alter table public.activities enable row level security;
drop policy if exists "Users can all access their own activities" on public.activities;
create policy "Users can all access their own activities" on public.activities for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 5. Novels
-- ──────────────────────────────────────────────────────
create table if not exists public.novels (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  title text,
  icon text,
  status text,
  word_count double precision,
  target_word_count double precision,
  progress double precision,
  chapters double precision, -- or integer
  notes_count double precision,
  created_date text,
  last_updated text,
  genre jsonb,
  is_recently_updated boolean,
  cover_image text,
  created_at timestamptz default now()
);
alter table public.novels enable row level security;
drop policy if exists "Users can all access their own novels" on public.novels;
create policy "Users can all access their own novels" on public.novels for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 6. Novel Content
--    Stores large content blobs or JSON structure for novels
-- ──────────────────────────────────────────────────────
create table if not exists public.novel_content (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  data text, -- Storing JSON string or large text
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.novel_content enable row level security;
drop policy if exists "Users can all access their own novel content" on public.novel_content;
create policy "Users can all access their own novel content" on public.novel_content for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 7. Bin Items
-- ──────────────────────────────────────────────────────
create table if not exists public.bin_items (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  type text,
  original_id text,
  context_id text,
  title text,
  deleted_at text,
  payload jsonb
);
alter table public.bin_items enable row level security;
drop policy if exists "Users can all access their own bin items" on public.bin_items;
create policy "Users can all access their own bin items" on public.bin_items for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 8. Snippets
-- ──────────────────────────────────────────────────────
create table if not exists public.snippets (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  title text,
  lang text,
  tags jsonb,
  content text,
  filename text,
  path text,
  creator text,
  created_at_str text, -- keeping original string field name separate from postgres timestamp if needed
  updated_at_str text,
  created_at timestamptz default now()
);
alter table public.snippets enable row level security;
drop policy if exists "Users can all access their own snippets" on public.snippets;
create policy "Users can all access their own snippets" on public.snippets for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 9. Books
-- ──────────────────────────────────────────────────────
create table if not exists public.books (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  title text,
  author text,
  category text,
  status text,
  progress double precision,
  notes_count double precision,
  last_accessed text,
  cover_image text,
  isbn text,
  year double precision,
  notes jsonb, -- Array of notes
  created_at_str text,
  updated_at_str text,
  created_at timestamptz default now()
);
alter table public.books enable row level security;
drop policy if exists "Users can all access their own books" on public.books;
create policy "Users can all access their own books" on public.books for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 10. Meetings
-- ──────────────────────────────────────────────────────
create table if not exists public.meetings (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  title text,
  description text,
  project text,
  date text,
  start_time text,
  end_time text,
  duration double precision,
  timezone text,
  location text,
  meeting_link text,
  meeting_type text,
  platform text,
  attendees jsonb,
  organizer text,
  agenda text,
  notes text,
  action_items jsonb,
  status text,
  priority text,
  color text,
  labels jsonb,
  recurring jsonb,
  reminders jsonb,
  attachments jsonb,
  created_at_str text,
  updated_at_str text,
  created_by text,
  created_at timestamptz default now()
);
alter table public.meetings enable row level security;
drop policy if exists "Users can all access their own meetings" on public.meetings;
create policy "Users can all access their own meetings" on public.meetings for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 11. Articles
-- ──────────────────────────────────────────────────────
create table if not exists public.articles (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  title text,
  platform text,
  pipeline text,
  word_count double precision,
  content text,
  url text,
  scheduled_date text,
  engagement jsonb,
  tags jsonb,
  last_updated text,
  created_date text,
  icon text,
  excerpt text,
  created_at timestamptz default now()
);
alter table public.articles enable row level security;
drop policy if exists "Users can all access their own articles" on public.articles;
create policy "Users can all access their own articles" on public.articles for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 12. User Data (generic sync table for PouchDB → Supabase sync)
--     All web-app collections sync here as JSONB blobs via SyncService.
--     The primary key is composite so the same UUID in different
--     collections/profiles never conflicts.
-- ──────────────────────────────────────────────────────
create table if not exists public.user_data (
  id           text        not null,
  user_id      uuid        references auth.users(id) not null default auth.uid(),
  profile_id   text        not null default 'default',
  collection   text        not null,
  data         jsonb       not null default '{}',
  deleted      boolean     not null default false,
  updated_at   timestamptz not null default now(),
  primary key (id, collection, profile_id)
);
alter table public.user_data enable row level security;
drop policy if exists "Users can manage their own sync data" on public.user_data;
create policy "Users can manage their own sync data"
  on public.user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable Realtime so subscribeRealtime() receives live cross-device updates.
-- Idempotent: only adds the table if it isn't already a member of the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'user_data'
  ) then
    alter publication supabase_realtime add table public.user_data;
  end if;
end $$;


-- ──────────────────────────────────────────────────────
-- 15. Research Collections (renamed from research_libraries)
-- ──────────────────────────────────────────────────────
-- Migration for existing deployments: ALTER TABLE public.research_libraries RENAME TO public.research_collections;
create table if not exists public.research_collections (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  name text,
  description text,
  color text,
  created_date text,
  last_modified text,
  created_at timestamptz default now()
);
alter table public.research_collections enable row level security;
drop policy if exists "Users can all access their own research collections" on public.research_collections;
create policy "Users can all access their own research collections" on public.research_collections for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 16. Research Sources
-- ──────────────────────────────────────────────────────
create table if not exists public.research_sources (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  library_id text,
  title text,
  source_type text,
  url text,
  description text,
  author text,
  publish_date text,
  tags jsonb,
  status text,
  notes text,
  created_date text,
  last_accessed text,
  linked_task_ids jsonb,
  created_at timestamptz default now()
);
alter table public.research_sources enable row level security;
drop policy if exists "Users can all access their own research sources" on public.research_sources;
create policy "Users can all access their own research sources" on public.research_sources for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 17. Research Summaries
-- ──────────────────────────────────────────────────────
create table if not exists public.research_summaries (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  library_id text,
  title text,
  content text,
  source_ids jsonb,
  tags jsonb,
  created_date text,
  last_modified text,
  created_at timestamptz default now()
);
alter table public.research_summaries enable row level security;
drop policy if exists "Users can all access their own research summaries" on public.research_summaries;
create policy "Users can all access their own research summaries" on public.research_summaries for all using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────
-- Profiles (user roles for admin access)
-- ──────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Users can read and update their own profile
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Security-definer function to check admin role without RLS recursion
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Admins can read all profiles (uses is_admin() to avoid recursive RLS)
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles
  for select using (public.is_admin());

-- Admins can update any profile (e.g. promote/demote roles)
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles" on public.profiles
  for update using (public.is_admin());

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────────────
-- Storage: Library bucket + RLS policies
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
  values ('library', 'library', false, 52428800)
  on conflict (id) do nothing;

-- Each file is stored as {user_id}/{file_id}.ext — policies scope by first path segment.
drop policy if exists "Library: users can upload their own files" on storage.objects;
create policy "Library: users can upload their own files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'library'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Library: users can read their own files" on storage.objects;
create policy "Library: users can read their own files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'library'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Library: users can delete their own files" on storage.objects;
create policy "Library: users can delete their own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'library'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
