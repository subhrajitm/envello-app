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
create policy "Users can all access their own articles" on public.articles for all using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────
-- 15. Research Libraries
-- ──────────────────────────────────────────────────────
create table if not exists public.research_libraries (
  id text primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  name text,
  description text,
  color text,
  created_date text,
  last_modified text,
  created_at timestamptz default now()
);
alter table public.research_libraries enable row level security;
create policy "Users can all access their own research libraries" on public.research_libraries for all using (auth.uid() = user_id);


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
  created_at timestamptz default now()
);
alter table public.research_sources enable row level security;
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
create policy "Users can all access their own research summaries" on public.research_summaries for all using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────
-- Optional: Storage Buckets Setup (Requires extension/admin)
-- ──────────────────────────────────────────────────────
-- insert into storage.buckets (id, name, public) values ('envello-files', 'envello-files', false) on conflict do nothing;
-- create policy "Authenticated users can upload files" on storage.objects for insert with check (bucket_id = 'envello-files' and auth.role() = 'authenticated');
-- create policy "Users can see their own files" on storage.objects for select using (bucket_id = 'envello-files' and auth.uid() = owner);
