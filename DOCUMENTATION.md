# Envello Project Documentation

## 1. Project Overview

**Envello** is a productivity and creative writing application designed to help users manage tasks, notes, projects, and write novels. It features a modern, intelligent interface and runs as both a **Desktop Application** (Windows/macOS/Linux via Tauri) and a **Web Application**.

The project is structured as an **Nx Monorepo**, ensuring code sharing, scalability, and a unified development workflow.

---

## 2. Architecture

The project follows a **Clean Architecture** approach using shared libraries to decouple business logic from the presentation layer and platform-specific implementations.

### Implementation Strategy
-   **Shared Core**: All business logic (`libs/state`), data models (`libs/domain`), and data abstraction (`libs/data`) are shared.
-   **Platform Specifics**:
    -   **Desktop**: Uses `Tauri` for OS integration and `SQLite` for local data persistence.
    -   **Web**: Uses standard browser APIs and `PouchDB` (IndexedDB) for persistence. and `Supabase` (Backend)
-   **Synchronization**: The architecture is designed to keep Web and Desktop in sync by forcing them to implement the same `DataService` interface and use the same `StoreService`.

---

## 3. Technology Stack

### Core Frameworks
-   **Frontend**: Angular v19+ (Components, Signals, DI, Router)
-   **State Management**: Angular Signals (Centralized in `libs/state`)
-   **Desktop Framework**: Tauri v2 (Rust + Webview)
-   **Styling**: TailwindCSS v4, Vanilla CSS variables

### Data & Persistence
-   **Desktop Database**: SQLite (via `@tauri-apps/plugin-sql`)
-   **Web Database**: PouchDB (IndexedDB wrapper for browser persistence)
-   **Backend/Auth**: Supabase (via `@supabase/supabase-js` & SQL schema)
-   **Data Interchange**: Custom JSON Export/Import format

### AI & Intelligence
-   **Orchestration**: LangChain.js (`@langchain/core`, `@langchain/openai`, `@langchain/ollama`) for managing AI interactions.
-   **Models**: Support for OpenAI, Anthropic, and Local Models (Ollama).

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
│   ├── web/                # Angular PWA web app
│   ├── admin/              # Admin dashboard
│   └── landing/            # Public marketing site
├── libs/                   # Shared libraries
│   ├── core/               # Utilities, Guards, Interceptors (@envello/core)
│   ├── data/               # Abstract Data Services (@envello/data)
│   ├── domain/             # Types, Interfaces, Models (@envello/domain)
│   ├── state/              # Business Logic & Signals (@envello/state)
│   └── ui/                 # Reusable Components (@envello/ui)
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

---

## 5. Key Functionalities

### Productivity
-   **Tasks**: Create, track, and organize tasks with priorities, due dates, and recurrent options.
-   **Notes**: Markdown/Rich-text notes with categorization.
-   **Projects**: High-level containers for work, tracking progress and word counts.
-   **Journal**: Daily entries and structured journaling projects.

### Creative Writing
-   **Novels**: Dedicated workspace for writing books, managing chapters, characters, and locations.
-   **Word Counting**: Automatic tracking of writing progress.
-   **Export**: Export functionality for compilations.

### System
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

**Start Development Server:**
```bash
# Desktop
npx nx serve desktop

# Web
npx nx serve web
```

**Build Applications:**
```bash
# Build all
npx nx run-many --target=build --all

# Build specific
npx nx build desktop --configuration=production
```

**Test:**
```bash
npx nx test desktop
npx nx test web
```

**Code Quality:**
```bash
npx nx lint desktop
npx nx format:write
```

---

## 7. Configuration Details

-   **`angular.json`**: (Legacy) Replaced/Augmented by `project.json` in each app/lib folder.
-   **`nx.json`**: Global Nx configuration and caching rules.
-   **`tsconfig.base.json`**: Base TypeScript config defining path mappings (`@envello/*`).
-   **`tauri.conf.json`**: Configuration for the Tauri desktop app window, permissions, and bundles.
