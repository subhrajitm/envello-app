# Envello App - Architecture Summary

## Quick Reference Guide

### Application Versions

| Aspect | Desktop (Tauri) | Web (Browser) |
|--------|----------------|---------------|
| **Entry Point** | `/login` → `/workspace` | `/overview` |
| **Authentication** | Supabase + Guest Mode | Stub (auto-authenticated) |
| **Database** | SQLite (`envello.db`) | RxDB (IndexedDB) |
| **File Storage** | Native FS (Markdown files) | IndexedDB |
| **Service** | `SqliteService` | `RxdbService` |
| **Unique Features** | Voice commands, File uploads | Calendar view, Planning board |

---

## Page-by-Page Data Flow Summary

### 1. **Login/Signup** (Desktop Only)
```
User Input → AuthService → Supabase → Session Storage → Navigate to /workspace
```
**Data**: Session token, User object, Guest mode flag

---

### 2. **Workspace (Desktop) / Overview (Web)**
```
Init → StoreService → DB Load → Signals Update → UI Render
User Action → CRUD → DB Persist → Signal Update → UI Auto-Update
```
**Data**: Tasks, Notes, Activities, Planning Items, Novels

**Desktop Features**: Voice commands, Performance metrics, File uploads
**Web Features**: Calendar, Planning board, Auto-schedule

---

### 3. **Novels** (`/novels`, `/novels/:id`)
```
List View: Load novels → Display grid/list
Editor: Load content → TiptapEditor → Auto-save (debounced) → Update stats → Persist
```
**Data**: Novel metadata, Novel content (HTML/JSON)
**Features**: Rich text editing, Word count, Chapters, Version history

---

### 4. **Daily Notes** (`/daily-notes`)
```
Load notes → Display list → Create/Edit → Convert HTML↔Markdown → Save to file/DB
```
**Data**: Note metadata (DB), Note content (Files/IndexedDB)
**Storage**: Desktop = `.md` files, Web = IndexedDB

---

### 5. **Tasks** (`/tasks`)
```
Load tasks → Display with filters → CRUD operations → Persist → Activity log
```
**Data**: Tasks with subtasks, dependencies, recurring patterns, time tracking
**Features**: Hierarchical tasks, Dependencies, Recurring, Time tracking, Attachments

---

### 6. **Journals** (`/journals`)
```
Load projects → Select project → Load entries → Kanban board → CRUD → Update stats
```
**Data**: Journal projects, Journal entries, Journal columns
**Features**: Kanban board, Custom columns, Entry linking, AI tracking

---

### 7. **Research** (`/research`)
```
Load libraries → Select library → Load sources/summaries → Display → CRUD
```
**Data**: Research libraries, Research sources, Research summaries
**Features**: Organization, Categorization, Source tracking

---

### 8. **Articles** (`/articles`)
```
Load articles → Display pipeline → CRUD → Update metrics → Persist
```
**Data**: Articles with platform, pipeline, word count, engagement
**Features**: Pipeline tracking, Engagement metrics, Scheduling

---

### 9. **Meetings** (`/meetings`)
```
Load meetings → Calendar/List view → CRUD → Set reminders → Track attendance
```
**Data**: Meetings with attendees, agenda, notes, action items
**Features**: Calendar integration, Reminders, Attendee tracking

---

### 10. **Books** (`/books`)
```
Load books → Display library → CRUD → Update progress → Persist
```
**Data**: Books with progress, notes, metadata
**Features**: Reading progress, Note taking, Categorization

---

### 11. **Code Snippets** (`/snippets`)
```
Load snippets → Display library → CRUD → Search/Filter → Display results
```
**Data**: Code snippets with language, tags, content
**Features**: Language detection, Tag management, Search

---

### 12. **Activity Log** (`/activity-log`)
```
Load activities → Display chronological feed → Auto-update → Filter
```
**Data**: Activity entries (entry, sync, ai, system)
**Sources**: Task/Note/Novel creation, System events

---

### 13. **Bin** (`/bin`)
```
Load bin items → Display deleted items → Restore/Delete permanently
```
**Data**: Deleted items with original data
**Features**: Soft delete, Restore, Permanent deletion

---

## Core Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        COMPONENTS                            │
│  (Workspace, Novels, Tasks, Notes, Journals, etc.)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC SERVICES                    │
│  StoreService, NovelContentService, JournalService, etc.    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  PERSISTENCE LAYER                           │
│  Desktop: SqliteService  │  Web: RxdbService                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                             │
│  Desktop: SQLite DB + File System  │  Web: IndexedDB        │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Collections (17 Total)

### Core Data
1. **tasks** - Task management with subtasks, dependencies
2. **notes** - Daily notes with markdown content
3. **planning_items** - Planning board items
4. **activities** - Activity log entries
5. **novels** - Novel metadata
6. **novel_content** - Novel content (HTML/JSON)

### Extended Features
7. **bin_items** - Deleted items (soft delete)
8. **snippets** - Code snippets
9. **books** - Book library
10. **meetings** - Meeting management
11. **articles** - Article publishing pipeline

### Journals
12. **journal_projects** - Journal projects
13. **journal_entries** - Journal entries
14. **journal_columns** - Kanban columns

### Research
15. **research_libraries** - Research libraries
16. **research_sources** - Research sources
17. **research_summaries** - Research summaries

---

## Service Responsibilities

### StoreService
- **Purpose**: Central state management
- **Data**: Tasks, Notes, Novels, Activities, Planning Items
- **Methods**: CRUD operations, Activity logging, File content management

### SqliteService (Desktop)
- **Purpose**: SQLite database management
- **Features**: 17 tables, Reactive BehaviorSubjects, JSON serialization
- **Location**: Tauri app data directory

### RxdbService (Web)
- **Purpose**: RxDB/IndexedDB management
- **Features**: 17 collections, Reactive observables, Query builder
- **Limitation**: Free version = 16 collections (currently using 17!)

### FileSystemService
- **Desktop**: Native FS via Tauri (`.md` files)
- **Web**: Browser File System API + IndexedDB fallback

### AuthService
- **Desktop**: Supabase + Guest mode
- **Web**: Stub (auto-authenticated in dev)

### NovelContentService
- **Purpose**: Novel content management
- **Features**: Auto-save, Word count, Version history

### Other Services
- JournalService, ResearchService, ArticleService, MeetingsService
- BooksService, SnippetsService, BinService
- UserService, NotificationService, AIService

---

## Data Flow Patterns

### Read Operation
```
Component Init
    ↓
Service.load()
    ↓
Persistence Layer (SqliteService/RxdbService)
    ↓
Database Query
    ↓
Signal Update
    ↓
UI Auto-Render
```

### Write Operation
```
User Action
    ↓
Component Event Handler
    ↓
Service.update()
    ↓
Signal Update (immediate UI feedback)
    ↓
Persistence Layer (async)
    ↓
Database Write
    ↓
Activity Log (if applicable)
```

### File Content (Notes/Novels)
```
Load:
  DB (metadata) + File System (content) → Markdown → HTML → Display

Save:
  HTML → Markdown → File System
  Metadata → DB
  (Debounced 1 second)
```

---

## Key Technologies

### Frontend
- **Framework**: Angular 20 (Standalone Components)
- **State**: Angular Signals (reactive)
- **Routing**: Angular Router (lazy loading)
- **Forms**: Reactive Forms

### Desktop
- **Runtime**: Tauri v2
- **Database**: SQLite (via Tauri plugin)
- **File System**: Native FS (via Tauri plugin)
- **Notifications**: Tauri notification plugin

### Web
- **Database**: RxDB + Dexie (IndexedDB)
- **File System**: Browser File System API
- **Notifications**: Browser Notification API

### Shared
- **Rich Text**: TiptapEditor (Prosemirror-based)
- **Markdown**: `marked` (MD→HTML), `turndown` (HTML→MD)
- **Auth**: Supabase (desktop only)
- **AI**: LangChain.js (OpenAI, Anthropic, Ollama)

---

## Performance Optimizations

1. **Lazy Loading**: Components loaded on-demand
2. **Debounced Saves**: 1-second delay for auto-save
3. **Signal-based Reactivity**: Efficient change detection
4. **Pagination**: Limit initial data load
5. **Caching**: In-memory content cache
6. **Activity Log Limit**: Keep last 50 entries

---

## Current Limitations

### Web Version
- ⚠️ **RxDB Collection Limit**: Using 17 collections, free version supports 16
- ⚠️ **No Real Auth**: Stub authentication only
- ⚠️ **Storage Limits**: Browser IndexedDB quota limits
- ⚠️ **No Cloud Sync**: Local-only storage

### Desktop Version
- ⚠️ **No Cloud Sync**: Local-only storage
- ⚠️ **Single User**: No multi-user support

### Both
- ⚠️ **No Collaboration**: No real-time collaborative editing
- ⚠️ **No Mobile Apps**: Desktop/Web only
- ⚠️ **Limited Search**: No full-text search across all content

---

## Recommended Next Steps

### Critical
1. **Fix RxDB Collection Limit**: Upgrade to premium or consolidate collections
2. **Implement Cloud Sync**: Supabase integration for cross-device sync
3. **Add Web Authentication**: Real auth for web version

### High Priority
4. **Full-Text Search**: Search across all content types
5. **Export/Import**: Backup and migration tools
6. **Mobile Apps**: iOS/Android versions
7. **Testing**: Comprehensive unit and integration tests

### Medium Priority
8. **Collaboration**: Real-time collaborative editing
9. **Version Control**: Git-like versioning for novels
10. **Analytics**: Usage statistics and insights
11. **Advanced AI**: Enhanced AI features with LangChain

---

## File Structure

```
envello-app/
├── apps/
│   ├── desktop/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── components/     # UI Components
│   │       │   ├── services/       # Business Logic
│   │       │   ├── core/
│   │       │   │   ├── services/   # Core Services (Auth, DB, FS)
│   │       │   │   └── guards/     # Route Guards
│   │       │   └── app.routes.ts   # Routing
│   │       └── main.ts
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── components/     # UI Components (shared structure)
│           │   ├── services/       # Business Logic (shared)
│           │   ├── core/
│           │   │   └── services/   # Core Services (RxDB, FS)
│           │   └── app.routes.ts   # Routing (different entry)
│           └── main.ts
├── src-tauri/                      # Tauri configuration
├── package.json
└── angular.json
```

---

## Quick Command Reference

### Development
```bash
# Desktop
npm run dev              # Port 4200
npm run start            # Port 4200

# Web
npm run start:web        # Port 4200

# Specific Port
npm run dev -- --port 4202
```

### Build
```bash
# Desktop
npm run build            # Production
npm run build:staging    # Staging

# Web
npm run build:web        # Production
```

### Testing
```bash
npm run test             # Desktop tests
npm run test:web         # Web tests
```

---

## Environment Configuration

### Desktop
- `environment.ts` - Development
- `environment.staging.ts` - Staging
- `environment.prod.ts` - Production

### Web
- `environment.ts` - Development
- `environment.staging.ts` - Staging
- `environment.prod.ts` - Production

**Key Differences**:
- Desktop: Supabase URL/Key, Tauri-specific settings
- Web: RxDB configuration, Browser-specific settings

---

## Conclusion

Envello is a well-architected, dual-platform application with:
- ✅ Clean separation between web and desktop
- ✅ Reactive state management with Angular Signals
- ✅ Offline-first architecture
- ✅ Comprehensive feature set for writers/creators
- ✅ Platform-specific optimizations

The data flow is consistent across both platforms, with the main differences being in the persistence layer (SQLite vs RxDB) and platform-specific features (voice commands, native file system, etc.).
