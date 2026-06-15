-- Sync improvements migration (2026-06-15)
-- Run in Supabase Dashboard → SQL Editor → New query

-- 1. Remove orphaned bin_items rows (collection no longer used after soft-delete refactor)
DELETE FROM user_data WHERE collection = 'bin_items';

-- 2. Server-side updated_at trigger — prevents client clock-skew from corrupting LWW ordering.
--    updated_at is now always set by the DB, never trusted from the client.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_data_updated_at ON user_data;
CREATE TRIGGER user_data_updated_at
BEFORE INSERT OR UPDATE ON user_data
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Tombstone cleanup — purge soft-deleted records older than 90 days.
--    Tombstones are only needed long enough for all devices to pull the deletion.
--    Schedule this as a pg_cron job or run periodically from a Supabase Edge Function.
--
--    Example pg_cron setup (run in Supabase Dashboard → Extensions → enable pg_cron):
--    SELECT cron.schedule('tombstone-cleanup', '0 3 * * *',
--      $$DELETE FROM user_data WHERE deleted = true AND updated_at < NOW() - INTERVAL '90 days'$$
--    );
--
--    One-time manual cleanup (safe to run now):
DELETE FROM user_data WHERE deleted = true AND updated_at < NOW() - INTERVAL '90 days';
