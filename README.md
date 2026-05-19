# Envello

A distraction-free productivity and creative writing workspace. Envello combines task management, note-taking, novel writing, research organization, project tracking, and credential vaulting into a single desktop-first application with web support.

Built with Angular + Tauri for desktop, with a shared architecture across all platforms.

---

## Apps

| App | Type | Platform | Port | Description |
|-----|------|----------|------|-------------|
| `desktop` | Tauri + Angular | macOS / Windows / Linux | 4200 | Native desktop app with SQLite persistence |
| `web` | Angular PWA | Browser | 4200 | Web app with PouchDB (IndexedDB) + Supabase cloud sync |
| `mobile` | Tauri Mobile | iOS / Android | 4202 | Mobile app (Tauri iOS & Android targets) |
| `admin` | Angular SPA | Browser | 4201 | Admin dashboard — AI config, users, feature flags, usage |
| `landing` | Angular SPA | Browser | — | Marketing landing page |

---

## Development

### Prerequisites

- Node.js v22+
- npm v10+
- Rust (latest stable) — required for Tauri desktop and mobile builds
- Xcode — required for iOS builds
- Android Studio + NDK — required for Android builds

### Install

```bash
npm install
```

---

## Commands

All commands use `npm exec nx` (the project convention). Never invoke `ng`, `jest`, or `tsc` directly.

### Dev Servers

```bash
# Desktop — browser-only preview (Angular on http://localhost:4200)
npm exec nx serve desktop

# Desktop — native Tauri window (compiles Rust + opens the OS window)
npm exec tauri dev

# Web PWA (http://localhost:4200)
npm exec nx serve web

# Mobile — browser preview (http://localhost:4202)
npm exec nx serve mobile

# Mobile — native iOS simulator
npm exec nx run mobile:tauri-ios

# Mobile — native Android emulator
npm exec nx run mobile:tauri-android

# Admin dashboard (http://localhost:4201)
npm exec nx serve admin

# Landing page
npm exec nx serve landing
```

> **Desktop preview note:** `npm exec nx serve desktop` opens the Angular app in your browser for fast UI iteration. To open the actual native macOS/Windows/Linux window (Rust + Webview), use `npm exec tauri dev` — it automatically starts the Angular dev server first via `beforeDevCommand`.

### Build

```bash
# Desktop — Angular frontend build
npm exec nx build desktop

# Desktop — production native binaries (macOS .dmg, Windows .exe, Linux .AppImage)
npm exec tauri build

# Desktop — specific configuration
npm exec nx build desktop --configuration development
npm exec nx build desktop --configuration staging
npm exec nx build desktop --configuration production   # default

# Web PWA
npm exec nx build web

# Mobile — iOS release build
npm exec nx run mobile:tauri-ios-build

# Mobile — Android release build
npm exec nx run mobile:tauri-android-build

# Admin dashboard
npm exec nx build admin

# Landing page
npm exec nx build landing

# Build everything at once
npm exec nx run-many --target=build --all
```

### Preview (static build)

```bash
# Serve a production build locally (no live reload)
npm exec nx run admin:serve-static
npm exec nx run landing:serve-static
```

### npm Script Aliases

The following short-form aliases are defined in `package.json`:

```bash
npm run dev            # = npm exec nx serve desktop (Angular dev server)
npm exec tauri dev     # Native desktop window
npm run build          # = npm exec nx build desktop
npm run build:staging  # = npm exec nx build desktop --configuration staging
npm run build:prod     # = npm exec nx build desktop --configuration production
npm run watch          # = npm exec nx build desktop --watch --configuration development
npm run start:web      # = npm exec nx serve web
npm run build:web      # = npm exec nx build web
```

### Test

```bash
# All projects
npm exec nx run-many --target=test

# Specific project
npm exec nx test desktop
npm exec nx test web
npm exec nx test admin

# Single library
npm exec nx test feature-tasks
npm exec nx test feature-daily-notes
```

### Lint

```bash
# All projects
npm exec nx run-many --target=lint

# Specific project
npm exec nx lint desktop
npm exec nx lint web
npm exec nx lint admin
```

### Format

```bash
# Auto-format all files (Prettier)
npm exec nx format:write

# Check formatting without writing
npm exec nx format:check
```

### Project Graph

```bash
# Open interactive dependency graph in browser
npm exec nx graph
```

### AI Context

```bash
# Regenerate AI_CONTEXT.md (auto-generated API surface for LLM agents)
npm run generate:context
```

---

## Architecture

### Nx Monorepo Structure

```
envello/
├── apps/
│   ├── desktop/        # Tauri desktop app (Angular frontend + Rust backend)
│   ├── web/            # Angular PWA
│   ├── mobile/         # Tauri mobile (iOS + Android)
│   ├── admin/          # Admin dashboard
│   └── landing/        # Marketing page
├── libs/
│   ├── domain/         # Pure TS interfaces (Task, Note, Novel, Project, etc.)
│   ├── data/           # Persistence abstraction (SQLite / PouchDB adapters)
│   ├── state/          # Global state (Angular Signals) — StoreService, BinService, VaultStore, etc.
│   ├── core/           # Singleton services (Auth, AI, Theme, Tauri bridge, etc.)
│   ├── ui/             # ~28 reusable UI components (Button, Modal, Sidebar, etc.)
│   └── feature-*/      # Feature modules (tasks, novels, projects, vault, etc.)
├── src-tauri/          # Rust backend (Tauri v2) — used by desktop and mobile
└── supabase/
    └── migrations/     # SQL migrations for Supabase (profiles, AI config, feature flags, usage logs)
```

### Dependency Flow

```
Feature libs → UI + State → Core + Data → Domain
```

| Layer | Library | Description |
|-------|---------|-------------|
| Domain | `@envello/domain` | Pure TypeScript interfaces — no Angular |
| Data | `@envello/data` | `DataService` persistence contract with SQLite and PouchDB implementations |
| State | `@envello/state` | Angular Signals-based global store |
| Core | `@envello/core` | Singleton services — Auth, AI, Theme, Tauri, SQLite, Supabase |
| UI | `@envello/ui` | ~28 reusable standalone Angular components |

### State Management

Angular Signals exclusively. No NgRx, no BehaviorSubjects.

### Persistence

| Platform | Storage | Sync |
|----------|---------|------|
| Desktop | SQLite via `@tauri-apps/plugin-sql` (Rust-backed) | Local only |
| Web | PouchDB (IndexedDB) | Supabase cloud sync |
| Mobile | SQLite via `@tauri-apps/plugin-sql` | Local only |

Adapter pattern in `libs/data` — platform-specific implementation is swapped at boot via `app.config.ts`.

---

## Features

### Core Modules

| Feature | Library | Description |
|---------|---------|-------------|
| Tasks | `@envello/feature-tasks` | Full task management with priority, due dates, subtasks, dependencies, recurring patterns, Pomodoro timer, focus mode, timeline view, voice input, AI assistant, and undo/redo |
| Daily Notes | `@envello/feature-daily-notes` | Rich-text journaling with Tiptap editor (tables, task lists, code blocks, images, YouTube embeds), folder-based organization, AI generation, and note backgrounds |
| Novels | `@envello/feature-novels` | Long-form fiction editor with chapter management, character/location tracking, synopsis, plot points, front matter, chapter groups, and version history |
| Projects | `@envello/feature-projects` | Project containers with progress tracking, word counts, team members, linked resources, due dates, and priority |
| Bookmarks | `@envello/feature-bookmarks` | Bookmark manager with table/grid views, folder organization, pinning, archiving, tagging, and AI integration |
| Vault | `@envello/feature-vault` | Encrypted credential manager for logins, API keys, SSH keys, database connections, and secure notes |
| Vendors | `@envello/feature-vendor` | Subscription/vendor tracker with ~60 vendor presets, billing cycles, cost calculation, and renewal reminders |
| Workspace | `@envello/feature-workspace` | Main dashboard hub with overview, recent activity, voice input, quick-add command bar, and CPU/latency metrics |

### AI Integration

Multi-provider AI assistant powered by LangChain.js. The platform admin sets a default provider + key; users can override with their own (BYOK).

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o-mini |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Haiku |
| Google | Gemini 2.0 Flash, Gemini 1.5 Pro |
| xAI | Grok |
| DeepSeek | deepseek-chat |
| Ollama | Local models (llama3, etc.) |

Integrated into Daily Notes (AI note generation), Tasks (subtask breakdown, time estimates), Bookmarks, and Vendor modules.

### Admin Dashboard

Accessible at `/admin`. Requires `role = 'admin'` in the `profiles` Supabase table.

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/admin` | Total users, AI requests today, active flags, recent activity |
| AI Settings | `/admin/ai-settings` | Platform provider, model, API key, global AI on/off |
| Users | `/admin/users` | View all users, promote to admin, suspend accounts |
| Usage | `/admin/usage` | AI usage logs by user, provider, and time period; CSV export |
| Feature Flags | `/admin/feature-flags` | Toggle platform features globally |

**Bootstrap first admin:**
```sql
-- Run in Supabase Dashboard → SQL Editor after running the migration
UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-uuid>';
-- Get your UUID: SELECT id, email FROM auth.users;
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular v20 (Standalone Components, Signals) |
| Desktop | Tauri v2 (Rust + Webview) |
| Mobile | Tauri v2 iOS + Android |
| Styling | TailwindCSS v4 + CSS Variables |
| Rich Text | Tiptap v3 (15+ extensions) |
| AI | LangChain.js (6 providers) |
| Database (Desktop/Mobile) | SQLite via `@tauri-apps/plugin-sql` |
| Database (Web) | PouchDB + Supabase |
| Backend | Supabase (Auth, Postgres, RLS, Realtime) |
| Build | Nx v22 + Angular Build + Tauri CLI v2 |
| Testing | Jest, Karma |
| Linting | ESLint with Nx module boundary enforcement |

---

## Themes

7 theme variants — switchable at runtime:

| Theme | Style |
|-------|-------|
| Kindle Paperwhite | Warm matte paper, amber accent (desktop default) |
| Enterprise Dark | Zinc dark, gold accent (web default) |
| Dark | True black, gold accent |
| Light | Kindle Paperwhite aesthetic |
| Colorful | White background, colorful palette |
| Typewriter | Minimal monochrome, warm paper |
| Enterprise Light | Clean professional with gradients |

---

## Documentation

| File | Description |
|------|-------------|
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Detailed architecture and dev workflow |
| [CHANGELOG.md](./CHANGELOG.md) | Release history |
| [AI_CONTEXT.md](./AI_CONTEXT.md) | Auto-generated API surface for LLM agents |
| [AGENTS.md](./AGENTS.md) | Nx workspace agent instructions |
| [supabase/migrations/](./supabase/migrations/) | Database migrations |

---

## License

Proprietary / Private.
