-- ─────────────────────────────────────────────────────────────────────────────
-- Envello Admin Tables
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Profiles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT,
  avatar_url  TEXT,
  username    TEXT,
  website     TEXT,
  role        TEXT        NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  status      TEXT        NOT NULL DEFAULT 'active', -- 'active' | 'suspended'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 2. is_admin() — SECURITY DEFINER bypasses RLS, safe for use in policies ─
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── 3. Profiles RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin());

-- ── 4. Platform AI Config (singleton) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_ai_config (
  id          INT         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider    TEXT        NOT NULL DEFAULT 'mock',
  model_name  TEXT        NOT NULL DEFAULT '',
  -- ⚠️  Store in Supabase Vault (Secrets) in production — not in a plain column
  api_key     TEXT        NOT NULL DEFAULT '',
  ai_enabled  BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID        REFERENCES auth.users(id)
);

INSERT INTO public.platform_ai_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.platform_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform AI config"
  ON public.platform_ai_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update platform AI config"
  ON public.platform_ai_config FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 5. Feature Flags ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  enabled     BOOLEAN     NOT NULL DEFAULT false,
  affects     TEXT        NOT NULL DEFAULT 'All Users',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.feature_flags (id, name, description, enabled, affects) VALUES
  ('ai-note-gen',        'AI Note Generation',   'Generate notes from AI prompts.',              true,  'All Users'),
  ('ai-task-assistant',  'AI Task Assistant',     'AI-powered task suggestions.',                 true,  'All Users'),
  ('ai-meeting-summary', 'AI Meeting Summary',    'Summarize meeting transcripts using AI.',      false, 'Beta users'),
  ('advanced-analytics', 'Advanced Analytics',    'Detailed usage analytics and CSV export.',     false, 'Admins only'),
  ('multi-provider-ai',  'Multi-provider AI',     'Users configure their own AI provider + key.', true,  'All Users')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read feature flags"
  ON public.feature_flags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update feature flags"
  ON public.feature_flags FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 6. AI Usage Logs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  provider         TEXT        NOT NULL DEFAULT 'mock',
  model            TEXT        NOT NULL DEFAULT '',
  prompt_length    INT         NOT NULL DEFAULT 0,
  response_length  INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_idx    ON public.ai_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_logs_created_idx ON public.ai_usage_logs (created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own usage"
  ON public.ai_usage_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all usage"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (public.is_admin());

-- ── 7. Bootstrap: promote the first admin manually ───────────────────────────
-- After running this migration, open the SQL editor and run:
--
--   UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-uuid>';
--
-- Get your UUID from: SELECT id, email FROM auth.users;
