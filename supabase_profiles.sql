-- ──────────────────────────────────────────────────────
-- 18. Profiles (Public User Data)
-- ──────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  username text,
  full_name text,
  avatar_url text,
  role text default 'Reader',
  bio text,
  preferences jsonb default '{"emailNotifications": true, "weeklyDigest": false, "autoBackup": true, "autoSchedule": false}'::jsonb,
  stats jsonb default '{"totalWords": 0, "totalDocuments": 0, "totalProjects": 0, "daysActive": 0, "currentStreak": 0, "lastLoginDate": null}'::jsonb,
  updated_at timestamptz default now(),
  joined_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Trigger to create profile handles new user signup automatically (Optional but recommended)
-- create or replace function public.handle_new_user() 
-- returns trigger as $$
-- begin
--   insert into public.profiles (id, email, full_name, avatar_url)
--   values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
--   return new;
-- end;
-- $$ language plpgsql security definer;

-- create or replace trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();
