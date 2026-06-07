# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Envello is an Nx monorepo containing a distraction-free productivity and note-taking application with both a **Desktop** (Tauri + Angular) and **Web** (Angular PWA) implementation.

## Commands

All tasks should be run via Nx. Always prefix with `npm exec nx` (never invoke `ng`, `jest`, or `tsc` directly).

```bash
# Dev servers
npm exec nx serve desktop          # Desktop app (Tauri)
npm exec nx serve web              # Web PWA

# Build
npm exec nx build desktop          # Desktop production build
npm exec nx build web              # Web production build
npm exec nx run-many --target=build --all  # Build everything

# Test
npm exec nx test desktop           # Desktop tests
npm exec nx test web               # Web tests
npm exec nx test feature-tasks     # Single lib test

# Lint & Format
npm exec nx lint desktop           # Lint specific project
npm exec nx format:write           # Auto-format all files

# Explore project graph
npm exec nx graph
```

For Nx CLI flags, always use `--help` rather than guessing.

## Architecture

### Monorepo Layout

- `apps/` — Runnable applications (desktop, web, admin, landing)
- `libs/` — Shared libraries imported via `@envello/*` path aliases

### Library Layers (dependency flows downward)

```
Feature libs (libs/feature-*)
    ↓
UI lib (libs/ui)          State lib (libs/state)
    ↓                           ↓
Core lib (libs/core)      Data lib (libs/data)
    ↓                           ↓
Domain lib (libs/domain)  — shared types & interfaces
```

- **`@envello/domain`** — Pure TypeScript interfaces and types (no Angular)
- **`@envello/data`** — Abstract `DataService` interface for persistence
- **`@envello/state`** — Angular Signals-based global store (`StoreService`)
- **`@envello/core`** — Singleton services (Auth, Tauri, SQLite, File System, `authGuard`, `MeetingsService`, `VoiceService`, `ArticleService`, `ResearchService`)
- **`@envello/ui`** — Reusable standalone Angular components
- **`@envello/feature-*`** — Self-contained feature libraries (tasks, books, bookmarks, vault, vendor, daily-notes, etc.)

### Platform-Specific Persistence

The `DataService` token is swapped per platform in each app's `app.config.ts`:

- **Desktop**: `SqliteDataService` — uses `@tauri-apps/plugin-sql` (SQLite on-device)
- **Web**: `PouchDbDataService` — uses PouchDB (IndexedDB) + Supabase cloud sync

### State Management

Angular Signals are used exclusively for reactive state. No NgRx or BehaviorSubjects for global state. The central store lives at `libs/state/src/lib/store.service.ts`.

### Routing

All feature routes use `loadComponent()` for lazy loading. Protected routes are guarded by `authGuard` from `@envello/core`. Route data `{ hasSidebar: false }` controls layout.

### Voice Input

`VoiceService` (`libs/core`) provides global voice dictation via the Web Speech API (`webkitSpeechRecognition`). Activated by holding Ctrl (500 ms) or clicking the mic button in the header. On macOS desktop, requires the `com.apple.security.device.audio-input` entitlement (`src-tauri/entitlements.plist`).

### AI Integration

LangChain.js orchestrates multiple LLM providers: OpenAI, Anthropic Claude, Google Gemini, xAI Grok, and Ollama (local). AI context schema is auto-generated via `npm run generate:context` → `AI_CONTEXT.md`.

## Key Conventions

- **Angular v20 Standalone Components** — no NgModules
- **TailwindCSS v4** — utility-first styling with CSS variables for theming
- **TypeScript strict mode** — enforced via `tsconfig.json`
- **2-space indent, single quotes** — enforced by `.editorconfig` and `.prettierrc`
- **Module boundaries** — ESLint Nx plugin enforces `@envello/*` import rules; do not import across layer boundaries incorrectly
