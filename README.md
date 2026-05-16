# Envello

A distraction-free productivity and creative writing workspace. Envello combines task management, note-taking, novel writing, research organization, project tracking, and credential vaulting into a single desktop-first application with web support.

Built with Angular + Tauri for desktop, with a shared architecture across all platforms.

## Apps

| App | Type | Platform | Description |
|-----|------|----------|-------------|
| `desktop` | Tauri + Angular | macOS / Windows / Linux | Native desktop app with SQLite persistence |
| `web` | Angular PWA | Browser | Web app with PouchDB (IndexedDB) + Supabase cloud sync |
| `admin` | Angular SPA | Browser | Admin dashboard |
| `landing` | Angular SPA | Browser | Marketing landing page |

## Features

### Core Modules

| Feature | Library | Description |
|---------|---------|-------------|
| Tasks | `@envello/feature-tasks` | Full task management with priority, due dates, subtasks, dependencies, recurring patterns, Pomodoro timer, focus mode, timeline view, voice input, and undo/redo history |
| Daily Notes | `@envello/feature-daily-notes` | Rich-text journaling with Tiptap editor (tables, task lists, code blocks, images, YouTube embeds), folder-based organization, AI summarization, and note backgrounds |
| Novels | `@envello/feature-novels` | Long-form fiction editor with chapter management, character/location tracking, synopsis, plot points, front matter, chapter groups, and version history |
| Projects | `@envello/feature-projects` | Project containers with progress tracking, word counts, team members, linked resources, due dates, and priority |
| Bookmarks | `@envello/feature-bookmarks` | Bookmark manager with table/grid views, folder organization, pinning, archiving, tagging, and AI integration |
| Vault | `@envello/feature-vault` | Encrypted credential manager for logins, API keys, SSH keys, database connections, and secure notes |
| Vendors | `@envello/feature-vendor` | Subscription/vendor tracker with ~60 vendor presets, billing cycles, cost calculation, and renewal reminders |
| Workspace | `@envello/feature-workspace` | Main dashboard hub with overview, recent activity, voice input, quick-add command bar, and CPU/latency metrics |

### AI Integration

Multi-provider AI assistant powered by LangChain.js:

- **OpenAI** — GPT-4o, GPT-4o-mini
- **Anthropic** — Claude 3.5 Sonnet, Claude 3 Haiku
- **Google** — Gemini 2.0 Flash, Gemini 1.5 Pro
- **xAI** — Grok
- **Local** — Ollama (runs models locally)

Integrated into Daily Notes, Tasks, Bookmarks, and Vendor modules for drafting, summarization, rewriting, and brainstorming.

## Architecture

### Nx Monorepo Structure

```
envello/
├── apps/
│   ├── desktop/        # Tauri desktop app
│   ├── web/            # Angular PWA
│   ├── admin/          # Admin dashboard
│   └── landing/        # Marketing page
├── libs/
│   ├── domain/         # Pure TS interfaces (Task, Note, Novel, Project, etc.)
│   ├── data/           # Persistence abstraction (SQLite / PouchDB adapters)
│   ├── state/          # Global state (Angular Signals) — StoreService, BinService, VaultStore, etc.
│   ├── core/           # Singleton services (Auth, AI, Theme, Tauri bridge, etc.)
│   ├── ui/             # ~28 reusable UI components (Button, Modal, Sidebar, etc.)
│   └── feature-*/      # Feature modules (tasks, novels, projects, vault, etc.)
└── src-tauri/          # Rust backend (Tauri v2)
```

### Dependency Flow

```
Feature libs → UI + State → Core + Data → Domain
```

- **Domain** — Pure interfaces, no framework dependencies
- **Data** — Persistence contract (`DataService`) with platform implementations
- **State** — Angular Signals-based global store
- **Core** — Singleton services (Auth, AI, Theme, Tauri, SQLite, etc.)
- **UI** — Standalone reusable Angular components

### State Management

Angular Signals exclusively throughout the application. No NgRx, no BehaviorSubjects for state.

### Persistence

- **Desktop:** SQLite via `@tauri-apps/plugin-sql` (Rust-backed)
- **Web:** PouchDB (IndexedDB) + Supabase for cloud sync
- Adapter pattern in `libs/data` with platform-specific implementations swapped at boot via `app.config.ts`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular v20 (Standalone Components, Signals, Reactive Forms) |
| Desktop | Tauri v2 (Rust + Webview) |
| Styling | TailwindCSS v4 + CSS Variables |
| Rich Text | Tiptap v3 (15+ extensions) |
| AI | LangChain.js (5 providers) |
| Database (Desktop) | SQLite |
| Database (Web) | PouchDB + Supabase |
| Testing | Jest, Karma |
| Linting | ESLint with Nx module boundary enforcement |
| Build | Nx v22.5 + Angular Build |

## Themes

7 theme variants — switchable at runtime:

| Theme | Style | Default On |
|-------|-------|-----------|
| Kindle Paperwhite | Warm matte paper, amber accent | Desktop (:root) |
| Enterprise Dark | Zinc dark, gold accent | Web (:root) |
| Dark | True black, gold accent | Desktop only |
| Light | Kindle Paperwhite aesthetic | |
| Colorful | White bg, colorful palette | |
| Typewriter | Minimal monochrome, warm paper | |
| Enterprise Light | Clean professional, gradients | |

## Development

### Prerequisites

- Node.js v22
- npm v10+
- Rust (latest stable) — for Tauri desktop development

### Setup

```bash
npm install
```

### Run

```bash
# Web app (browser)
npx nx serve web

# Desktop app (Tauri)
npx nx serve desktop

# Admin app
npx nx serve admin

# Landing page
npx nx serve landing
```

### Build

```bash
npx nx build web          # Web PWA to dist/apps/web
npx nx build desktop      # Desktop frontend to dist/apps/desktop
npx nx run tauri build    # Native desktop binaries (src-tauri/target/release)
```

### Test

```bash
npx nx run-many -t test
```

### Lint

```bash
npx nx run-many -t lint
```

## Key Libraries

| Package | Path | Purpose |
|---------|------|---------|
| `@envello/domain` | `libs/domain` | TypeScript interfaces (Task, Note, Project, etc.) |
| `@envello/data` | `libs/data` | Persistence abstraction layer |
| `@envello/state` | `libs/state` | Signals-based global store |
| `@envello/core` | `libs/core` | Services (Auth, AI, Theme, Tauri, SQLite, etc.) |
| `@envello/ui` | `libs/ui` | Reusable UI components |

## Documentation

- [Documentation](./DOCUMENTATION.md) — Detailed architecture and dev workflow
- [Changelog](./CHANGELOG.md) — Release history
- [AI Context](./AI_CONTEXT.md) — Auto-generated API surface for LLM agents
- [Agents](./AGENTS.md) — Nx workspace agent instructions

## License

Proprietary / Private.
