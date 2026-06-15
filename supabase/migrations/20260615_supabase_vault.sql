-- Supabase Vault credential storage (2026-06-15)
-- Run in Supabase Dashboard → SQL Editor → New query
--
-- Prerequisites:
--   1. Enable the Vault extension:
--      Dashboard → Database → Extensions → vault (toggle on)
--   2. The vault extension installs pgsodium and the vault schema automatically.
--
-- Credentials are stored as AES-256-GCM encrypted secrets via pgsodium.
-- The encryption key is managed by Supabase separately from the data —
-- a database dump does not expose plaintext credential values.

-- ── Tracking table ────────────────────────────────────────────────────────────
-- Maps (user_id, credential_id) → vault.secrets UUID.
-- The encrypted payload lives in vault.secrets (managed by pgsodium).
-- This table holds metadata and the foreign key into the vault.

CREATE TABLE IF NOT EXISTS user_credentials (
    user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id  text        NOT NULL,
    secret_id      uuid        NOT NULL,
    deleted_at     timestamptz,
    created_at     timestamptz NOT NULL DEFAULT NOW(),
    updated_at     timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, credential_id)
);

ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own credentials"
    ON user_credentials
    FOR ALL
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION _set_user_credentials_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_credentials_updated_at ON user_credentials;
CREATE TRIGGER user_credentials_updated_at
    BEFORE INSERT OR UPDATE ON user_credentials
    FOR EACH ROW EXECUTE FUNCTION _set_user_credentials_updated_at();

-- ── vault_upsert_credential ───────────────────────────────────────────────────
-- Inserts or replaces a credential. p_data is the full Credential JSON.
-- The secret name is scoped to the user so vault.secrets stays queryable.

CREATE OR REPLACE FUNCTION vault_upsert_credential(
    p_user_id       uuid,
    p_credential_id text,
    p_data          text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
    v_secret_id uuid;
    v_name      text := 'envello:' || p_user_id::text || ':' || p_credential_id;
BEGIN
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'access denied';
    END IF;

    SELECT secret_id INTO v_secret_id
    FROM user_credentials
    WHERE user_id = p_user_id AND credential_id = p_credential_id;

    IF v_secret_id IS NULL THEN
        v_secret_id := vault.create_secret(p_data, v_name);
        INSERT INTO user_credentials (user_id, credential_id, secret_id)
        VALUES (p_user_id, p_credential_id, v_secret_id);
    ELSE
        PERFORM vault.update_secret(v_secret_id, p_data, v_name);
        UPDATE user_credentials
        SET deleted_at = NULL, updated_at = NOW()
        WHERE user_id = p_user_id AND credential_id = p_credential_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_upsert_credential(uuid, text, text) TO authenticated;

-- ── vault_get_credentials ─────────────────────────────────────────────────────
-- Returns decrypted credential JSON rows for the current user.
-- Deleted (soft-deleted) rows are excluded.

CREATE OR REPLACE FUNCTION vault_get_credentials(
    p_user_id uuid
)
RETURNS TABLE (decrypted_data text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'access denied';
    END IF;

    RETURN QUERY
    SELECT ds.decrypted_secret
    FROM user_credentials uc
    JOIN vault.decrypted_secrets ds ON ds.id = uc.secret_id
    WHERE uc.user_id = p_user_id
      AND uc.deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_get_credentials(uuid) TO authenticated;

-- ── vault_soft_delete_credential ──────────────────────────────────────────────
-- Marks a credential deleted. The vault secret is retained for 90-day tombstone.

CREATE OR REPLACE FUNCTION vault_soft_delete_credential(
    p_user_id       uuid,
    p_credential_id text
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

    UPDATE user_credentials
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND credential_id = p_credential_id;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_soft_delete_credential(uuid, text) TO authenticated;

-- ── vault_delete_credential ───────────────────────────────────────────────────
-- Permanently removes the credential row and its vault secret.

CREATE OR REPLACE FUNCTION vault_delete_credential(
    p_user_id       uuid,
    p_credential_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
    v_secret_id uuid;
BEGIN
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'access denied';
    END IF;

    SELECT secret_id INTO v_secret_id
    FROM user_credentials
    WHERE user_id = p_user_id AND credential_id = p_credential_id;

    IF v_secret_id IS NOT NULL THEN
        DELETE FROM user_credentials
        WHERE user_id = p_user_id AND credential_id = p_credential_id;

        DELETE FROM vault.secrets WHERE id = v_secret_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION vault_delete_credential(uuid, text) TO authenticated;

-- ── Tombstone cleanup ─────────────────────────────────────────────────────────
-- Purge soft-deleted credentials (and their vault secrets) older than 90 days.
-- Schedule via pg_cron (Dashboard → Database → Extensions → pg_cron):
--
--   SELECT cron.schedule('vault-tombstone-cleanup', '0 3 * * *', $$
--     DELETE FROM vault.secrets
--     WHERE id IN (
--         SELECT secret_id FROM user_credentials
--         WHERE deleted_at IS NOT NULL
--           AND deleted_at < NOW() - INTERVAL '90 days'
--     );
--     DELETE FROM user_credentials
--     WHERE deleted_at IS NOT NULL
--       AND deleted_at < NOW() - INTERVAL '90 days';
--   $$);
