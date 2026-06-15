-- Envello user data sync table
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS user_data (
    id           TEXT        NOT NULL,
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id   TEXT        NOT NULL DEFAULT 'default',
    collection   TEXT        NOT NULL,
    data         JSONB       NOT NULL DEFAULT '{}',
    deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, id, collection, profile_id)
);

-- Index for efficient incremental pulls (gt updated_at queries)
CREATE INDEX IF NOT EXISTS user_data_user_updated_idx
    ON user_data (user_id, updated_at DESC);

-- Row Level Security: users can only read/write their own data
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own data"
    ON user_data FOR ALL
    TO authenticated
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
