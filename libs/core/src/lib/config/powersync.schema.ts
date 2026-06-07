import { column, Schema, Table } from '@powersync/web';

/**
 * PowerSync local SQLite schema.
 *
 * All synced collections map to a single `user_data` table — matching the
 * existing Supabase `user_data` table structure. The `data` column holds each
 * item as a JSON string. Queries filter by `collection` and `profile_id`.
 *
 * `local_vault` is local-only (never synced) and holds encrypted credentials.
 */

const user_data = new Table(
  {
    user_id:    column.text,
    profile_id: column.text,
    collection: column.text,
    data:       column.text,
    deleted:    column.integer,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_collection: ['collection'],
      idx_profile:    ['profile_id'],
    },
  }
);

const local_vault = new Table(
  {
    type: column.text,
    data: column.text,
  },
  { localOnly: true }
);

export const AppSchema = new Schema({ user_data, local_vault });
