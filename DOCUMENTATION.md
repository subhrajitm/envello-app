# Envello Project Documentation

## 1. Project Overview

**Envello** is a productivity and creative writing application designed to help users manage tasks, notes, projects, and write novels. It features a modern, intelligent interface and runs as a **Desktop Application** (Windows/macOS/Linux via Tauri), a **Mobile Application** (iOS/Android via Tauri), and a **Web Application**.

The project is structured as an **Nx Monorepo**, ensuring code sharing, scalability, and a unified development workflow.

---

## 2. Architecture

The project follows a **Clean Architecture** approach using shared libraries to decouple business logic from the presentation layer and platform-specific implementations.

### Implementation Strategy
-   **Shared Core**: All business logic (`libs/state`), data models (`libs/domain`), and data abstraction (`libs/data`) are shared.
-   **Platform Specifics**:
    -   **Desktop**: Uses `Tauri` for OS integration and `SQLite` for local data persistence.
    -   **Mobile**: Uses `Tauri` for iOS/Android integration and `SQLite` for local data persistence.
    -   **Web**: Uses standard browser APIs and `PouchDB` (IndexedDB) for persistence and `Supabase` (Backend).
-   **Synchronization**: The architecture is designed to keep Web and Desktop in sync by forcing them to implement the same `DataService` interface and use the same `StoreService`.

---

## 3. Technology Stack

### Core Frameworks
-   **Frontend**: Angular v20 (Standalone Components, Signals, DI, Router)
-   **State Management**: Angular Signals (Centralized in `libs/state`)
-   **Desktop/Mobile Framework**: Tauri v2 (Rust + Webview)
-   **Styling**: TailwindCSS v4, Vanilla CSS variables

### Data & Persistence
-   **Desktop/Mobile Database**: SQLite (via `@tauri-apps/plugin-sql`)
-   **Web Database**: PouchDB (IndexedDB wrapper for browser persistence)
-   **Backend/Auth**: Supabase (via `@supabase/supabase-js` & SQL schema)
-   **Data Interchange**: Custom JSON Export/Import format

### AI & Intelligence
-   **Orchestration**: LangChain.js (`@langchain/core`, `@langchain/openai`, `@langchain/anthropic`, `@langchain/google-genai`, `@langchain/xai`, `@langchain/ollama`) for managing AI interactions.
-   **Models**: Support for OpenAI, Anthropic, Google Gemini, xAI (Grok), and Local Models (Ollama).

### Productivity Tools
-   **Rich Text Editor**: Tiptap (`@tiptap/core`, `ngx-tiptap`) with extensions for tables, tasks, code blocks, and markdown shortcuts.
-   **Markdown Conversion**:
    -   `marked`: For parsing Markdown to HTML.
    -   `turndown`: For converting HTML content back to Markdown for storage/export.

### Tools & DevOps
-   **Monorepo Tool**: Nx (Task running, caching, dependency graph)
-   **Linting**: ESLint (with Angular & Nx plugins)
-   **Formatting**: Prettier
-   **Testing**: Jest (Unit testing)
-   **Build System**: Angular CLI (via Nx executors)

---

## 4. Folder Structure & Organization

The repository follows a standard Nx Monorepo layout.

```graphql
.
├── apps/                   # Deployable applications
│   ├── desktop/            # Tauri + Angular desktop app
│   ├── mobile/             # Tauri + Angular mobile app (iOS/Android)
│   ├── web/                # Angular PWA web app
│   ├── admin/              # Admin dashboard
│   └── landing/            # Public marketing site
├── libs/                   # Shared libraries
│   ├── core/               # Singleton Services (Auth, SQLite, Logging, Utilities)
│   ├── data/               # Abstract Data Services (@envello/data)
│   ├── domain/             # Types, Interfaces, Models (@envello/domain)
│   ├── state/              # Business Logic & Signals (@envello/state)
│   ├── ui/                 # Shared Components (Auth, Layout, Modals, Widgets)
│   ├── feature-bookmarks/  # Bookmark manager feature
│   ├── feature-daily-notes/# Daily notes feature
│   ├── feature-books/      # Creative writing feature
│   ├── feature-tasks/      # Task management feature
│   ├── feature-vault/      # Vault (secure storage) feature
│   ├── feature-vendor/     # Vendor management feature
│   └── feature-workspace/  # Workspace feature
├── src-tauri/              # Rust backend for Desktop app
│   ├── src/                # Rust source code
│   ├── tauri.conf.json     # Tauri configuration
│   └── Cargo.toml          # Rust dependencies
├── nx.json                 # Nx monorepo configuration
├── package.json            # Node dependencies
├── tsconfig.base.json      # Global TypeScript config (path mappings)
└── supabase_schema.sql     # Database schema for Supabase
```

### Key Directories Explained
-   **`apps/`**: Applications that are built and deployed. They are thin wrappers around shared logic.
-   **`libs/`**: The heart of the codebase. 90% of code should live here to be shareable.
-   **`src-tauri/`**: Contains the Rust `main.rs` loop and necessary configurations to bundle the web assets into a native executable.
-   **`nx.json`**: Controls the build pipeline, caching strategy, and task orchestration.

### Library Dependency Layers

Dependencies flow downward only — upper layers import from lower layers, never the reverse.

```
Feature libs (libs/feature-*)
        ↓
UI lib (libs/ui)          State lib (libs/state)
        ↓                           ↓
Core lib (libs/core)      Data lib (libs/data)
        ↓                           ↓
     Domain lib (libs/domain) — shared types & interfaces
```

-   **`@envello/domain`** — Pure TypeScript interfaces and types (no Angular)
-   **`@envello/data`** — Abstract `DataService` interface for persistence
-   **`@envello/state`** — Angular Signals-based global store (`StoreService`)
-   **`@envello/core`** — Singleton services (Auth, Tauri, SQLite, File System, `authGuard`)
-   **`@envello/ui`** — Reusable standalone Angular components
-   **`@envello/feature-*`** — Self-contained feature libraries (tasks, novels, bookmarks, vault, etc.)

---

## 5. Key Functionalities

### Productivity
-   **Tasks**: Create, track, and organize tasks with priorities, due dates, and recurrent options.
-   **Notes**: Markdown/Rich-text notes with categorization.
-   **Projects / Workspace**: High-level containers for work, tracking progress and word counts.
-   **Journal / Daily Notes**: Daily entries and structured journaling projects.
-   **Bookmarks**: Save, organize, and manage web bookmarks with folders, tags, pin, and archive.

### Creative Writing
-   **Novels**: Dedicated workspace for writing books, managing chapters, characters, and locations.
-   **Word Counting**: Automatic tracking of writing progress.
-   **Export**: Export functionality for compilations.

### System
-   **Vault**: Secure local storage for sensitive information.
-   **Vendor**: Vendor/subscription management.
-   **Bin**: Soft-delete functionality with restore options.
-   **Data Sync**: Manual Import/Export to transfer data between Desktop and Web.
-   **Contextual Intelligence**: Widgets for tracking recent activity and suggestions.

---

## 6. Development Workflow

### Prerequisites
-   Node.js (LTS)
-   Rust (for Tauri development)
-   pNPM or NPM

### Common Commands

> **Important**: Always prefix Nx commands with `npm exec nx` (never invoke `ng`, `jest`, or `tsc` directly).

**Start Development Servers:**
```bash
# Desktop (launches Tauri window + Angular dev server)
npm exec tauri dev

# Web
npm exec nx serve web

# Mobile
npm exec nx serve mobile

# Admin
npm exec nx serve admin

# Landing
npm exec nx serve landing

# Angular-only frontend (no Tauri window — useful for browser debugging)
npm exec nx serve desktop
```

**Build Applications:**
```bash
# Build all
npm exec nx run-many --target=build --all

# Build specific (production)
npm exec nx build desktop --configuration=production
npm exec nx build web --configuration=production
npm exec nx build mobile --configuration=production

# Build specific (staging)
npm exec nx build desktop --configuration=staging
```

**Mobile (iOS / Android):**
```bash
# Run on iOS simulator
npm exec nx run mobile:tauri-ios

# Run on Android emulator
npm exec nx run mobile:tauri-android

# Production build for iOS
npm exec nx run mobile:tauri-ios-build

# Production build for Android
npm exec nx run mobile:tauri-android-build
```

**Test:**
```bash
npm exec nx test desktop
npm exec nx test web
npm exec nx test mobile

# Test a specific feature library
npm exec nx test feature-tasks
npm exec nx test feature-bookmarks
```

**Code Quality:**
```bash
npm exec nx lint desktop
npm exec nx format:write

# Explore the project dependency graph
npm exec nx graph
```

**AI Context Generation:**
```bash
# Regenerate AI_CONTEXT.md from codebase (used for LLM context)
npm run generate:context
```

**NPM Script Shortcuts (package.json):**
```bash
npm start           # Alias for: npm exec nx serve desktop (Angular only, no Tauri window)
npm run dev         # Alias for: npm exec nx serve desktop (Angular only, no Tauri window)
npm run build       # Alias for: npm exec nx build desktop
npm run build:staging  # Alias for: npm exec nx build desktop --configuration staging
npm run build:prod  # Alias for: npm exec nx build desktop --configuration production
npm run start:web   # Alias for: npm exec nx serve web
npm run build:web   # Alias for: npm exec nx build web
npm test            # Alias for: npm exec nx test desktop
npm run test:web    # Alias for: npm exec nx test web
```

---

## 7. Configuration Details

-   **`angular.json`**: (Legacy) Replaced/Augmented by `project.json` in each app/lib folder.
-   **`nx.json`**: Global Nx configuration and caching rules.
-   **`tsconfig.base.json`**: Base TypeScript config defining path mappings (`@envello/*`).
-   **`tauri.conf.json`**: Configuration for the Tauri desktop/mobile app window, permissions, and bundles.
-   **`AI_CONTEXT.md`**: Auto-generated context file for LLM integrations (regenerate via `npm run generate:context`).
