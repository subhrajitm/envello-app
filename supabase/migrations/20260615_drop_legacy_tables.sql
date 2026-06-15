-- Legacy table cleanup (2026-06-15)
-- Run in Supabase Dashboard → SQL Editor → New query
--
-- These tables are from earlier architectures and are no longer read or written
-- by any current code path. All sync now goes through the `user_data` table.
-- Safe to drop — verify no external integrations depend on them before running.

-- ── Renamed collections (domain migration May 2026) ─────────────────────────
DROP TABLE IF EXISTS novels;
DROP TABLE IF EXISTS novel_content;
DROP TABLE IF EXISTS research_libraries;
DROP TABLE IF EXISTS library_books;

-- ── Bin items (soft-delete refactor June 2026) ──────────────────────────────
-- Data already cleaned up by 20260615_bin_soft_delete.sql
DROP TABLE IF EXISTS bin_items;

-- ── Individual collection tables (replaced by user_data generic table) ───────
-- The app previously had one Supabase table per collection.
-- All sync now uses user_data with a `collection` discriminator column.
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS planning_items;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS book_content;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS research_collections;
DROP TABLE IF EXISTS research_sources;
DROP TABLE IF EXISTS research_summaries;

-- ── Unimplemented / abandoned features ──────────────────────────────────────
-- These exist in Supabase but have no counterpart in the local app (SQLite or PouchDB).
-- Dropping them prevents confusion. Re-create via a new migration if the feature ships.
DROP TABLE IF EXISTS snippets;
DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS journal_columns;
DROP TABLE IF EXISTS journal_projects;
