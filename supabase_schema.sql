-- Enable Row Level Security
alter table if exists public.users enable row level security;

-- TASKS Table
create table public.tasks (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  priority text,
  status text default 'ACTIVE',
  project text,
  due_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  payload jsonb default '{}'::jsonb, -- Store full object for flexibility
  primary key (id)
);
alter table public.tasks enable row level security;
create policy "Users can only access their own tasks" on public.tasks for all using (auth.uid() = user_id);

-- NOTES Table
create table public.notes (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  content text,
  preview text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  tags text[],
  primary key (id)
);
alter table public.notes enable row level security;
create policy "Users can only access their own notes" on public.notes for all using (auth.uid() = user_id);

-- JOURNALS Table (Consolidated)
create table public.journals (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  entity_type text not null, -- 'project', 'entry', 'column'
  title text,
  content text,
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id)
);
alter table public.journals enable row level security;
create policy "Users can only access their own journals" on public.journals for all using (auth.uid() = user_id);

-- RESEARCH Table (Consolidated)
create table public.research (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  entity_type text not null, -- 'library', 'source', 'summary'
  title text,
  content text,
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id)
);
alter table public.research enable row level security;
create policy "Users can only access their own research" on public.research for all using (auth.uid() = user_id);

-- NOVELS Table
create table public.novels (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  status text,
  word_count integer default 0,
  content text, -- HTML Content
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id)
);
alter table public.novels enable row level security;
create policy "Users can only access their own novels" on public.novels for all using (auth.uid() = user_id);

-- ACTIVITIES Table
create table public.activities (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  text text not null,
  type text,
  time timestamp with time zone default now(),
  payload jsonb default '{}'::jsonb,
  primary key (id)
);
alter table public.activities enable row level security;
create policy "Users can only access their own activities" on public.activities for all using (auth.uid() = user_id);

-- GENERIC SYNC Table (for other collections if needed)
create table public.sync_items (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users not null,
  collection text not null,
  item_id text not null,
  payload jsonb not null,
  is_deleted boolean default false,
  updated_at timestamp with time zone default now(),
  primary key (id),
  unique(user_id, collection, item_id)
);
alter table public.sync_items enable row level security;
create policy "Users can only access their own sync items" on public.sync_items for all using (auth.uid() = user_id);
