-- Vault master-password lock (2026-06-15)
-- Run in Supabase Dashboard → SQL Editor → New query
--
-- Stores a PBKDF2-derived password hash (200k iterations, SHA-256) per user.
-- The plaintext master password never leaves the browser — only the hash is
-- stored here. The salt is random per user and stored alongside the hash.
--
-- This table is only written/read by the web vault unlock flow.
-- Desktop uses Stronghold (Argon2id in Rust) and never touches this table.

CREATE TABLE IF NOT EXISTS vault_lock_config (
    user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    salt          text NOT NULL,
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT NOW(),
    updated_at    timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE vault_lock_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own vault lock config"
    ON vault_lock_config
    FOR ALL
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION _set_vault_lock_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vault_lock_config_updated_at ON vault_lock_config;
CREATE TRIGGER vault_lock_config_updated_at
    BEFORE UPDATE ON vault_lock_config
    FOR EACH ROW EXECUTE FUNCTION _set_vault_lock_config_updated_at();

-- ── vault_lock_get ────────────────────────────────────────────────────────────
-- Returns the stored salt + hash for the user, or zero rows if not set up.

CREATE OR REPLACE FUNCTION vault_lock_get(p_user_id uuid)
RETURNS TABLE (salt text, password_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'access denied';
    END IF;

    RETURN QUERY
    SELECT vlc.salt, vlc.password_hash
    FROM vault_lock_config vlc
    WHERE vlc.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_lock_get(uuid) TO authenticated;

-- ── vault_lock_set ────────────────────────────────────────────────────────────
-- Upsert the salt + hash. Called once on first setup and again on password change.

CREATE OR REPLACE FUNCTION vault_lock_set(
    p_user_id       uuid,
    p_salt          text,
    p_password_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'access denied';
    END IF;

    INSERT INTO vault_lock_config (user_id, salt, password_hash)
    VALUES (p_user_id, p_salt, p_password_hash)
    ON CONFLICT (user_id) DO UPDATE
        SET salt          = EXCLUDED.salt,
            password_hash = EXCLUDED.password_hash,
            updated_at    = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION vault_lock_set(uuid, text, text) TO authenticated;
