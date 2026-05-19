-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add email column to profiles (safe — idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the signup trigger to also persist email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN new;
END;
$$;

-- Backfill email for existing profiles
-- (Requires service-role key or running directly in the Supabase SQL editor)
UPDATE public.profiles p
SET    email = u.email
FROM   auth.users u
WHERE  p.id = u.id
AND    p.email IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Admin audit log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email  TEXT        NOT NULL DEFAULT '',
  action       TEXT        NOT NULL,  -- role_change | status_change | ai_config_update | flag_update
  target_id    TEXT,                  -- affected user_id or resource id
  details      TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_admin_idx   ON public.admin_audit_log (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert audit entries" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit entries"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all audit entries" ON public.admin_audit_log;
CREATE POLICY "Admins can read all audit entries"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_admin());
