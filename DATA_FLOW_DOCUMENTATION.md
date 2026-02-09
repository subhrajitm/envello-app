# Envello App - Data Flow Documentation

## Table of Contents
1. [Application Architecture Overview](#application-architecture-overview)
2. [Web vs Desktop Differences](#web-vs-desktop-differences)
3. [Data Flow by Page/Feature](#data-flow-by-pagefeature)
4. [Core Services](#core-services)
5. [Data Persistence Layer](#data-persistence-layer)

---

## Application Architecture Overview

Envello is a dual-platform application built with Angular 20, consisting of:
- **Web App**: Browser-based version using RxDB (IndexedDB) for local storage
- **Desktop App**: Tauri-based native application using SQLite for local storage

Both versions share the same component structure and business logic but differ in their data persistence strategies.

### Technology Stack
- **Framework**: Angular 20 (Standalone Components)
- **Desktop Runtime**: Tauri v2
- **Web Storage**: RxDB with Dexie (IndexedDB wrapper)
- **Desktop Storage**: SQLite via Tauri plugin
- **State Management**: Angular Signals
- **Rich Text Editor**: TiptapEditor
- **Authentication**: Supabase (Desktop), Stub (Web)

---

## Web vs Desktop Differences

### Authentication
**Desktop**:
- Full Supabase integration (`AuthService`)
- Guest mode support (local-only usage)
- Session management with token refresh
- Routes: `/login`, `/sign-up`
- Auth guard protects all main routes

**Web**:
- Stub authentication (development mode)
- No real authentication in production
- Auto-authenticated in development
- No login/signup pages
- Direct access to `/overview`

### Data Persistence
**Desktop**:
- **Service**: `SqliteService`
- **Storage**: SQLite database (`envello.db`)
- **Location**: Tauri app data directory
- **Features**:
  - Reactive BehaviorSubjects for each data type
  - Automatic sync on CRUD operations
  - File system integration for notes/novels
  - Supports offline-first architecture

**Web**:
- **Service**: `RxdbService`
- **Storage**: RxDB with Dexie (IndexedDB)
- **Location**: Browser IndexedDB
- **Features**:
  - Reactive observables via RxDB
  - Browser-based persistence
  - Limited to 16 collections (free version)
  - File system via browser APIs

### File System
**Desktop**:
- Native file system access via Tauri
- Notes stored as `.md` files
- Configurable storage directory
- Full read/write permissions

**Web**:
- Browser File System API (limited)
- IndexedDB for file content
- No direct file system access
- Content stored in database

---

## Data Flow by Page/Feature

### 1. Login/Signup (Desktop Only)

**Route**: `/login`, `/sign-up`

**Components**:
- `LoginComponent`
- `SignUpComponent`

**Data Flow**:
```
User Input → LoginComponent
    ↓
AuthService.login(email, password)
    ↓
SupabaseService.client.auth.signInWithPassword()
    ↓
Session stored in AuthService._session signal
    ↓
Router navigates to /workspace
    ↓
Auth state change listener updates UI
```

**Services Used**:
- `AuthService`: Manages authentication state
- `SupabaseService`: Supabase client wrapper
- `LoggingService`: Logs auth events

**Data Stored**:
- Session token (in-memory signal)
- User object (in-memory signal)
- Guest mode flag (localStorage)

---

### 2. Workspace (Desktop) / Overview (Web)

**Desktop Route**: `/workspace`
**Web Route**: `/overview`

**Components**:
- Desktop: `WorkspaceComponent`
- Web: `OverviewComponent`

**Data Flow**:
```
Component Init
    ↓
StoreService loads data from DB
    ↓
Desktop: SqliteService.loadAllData()
Web: RxdbService.getAll()
    ↓
Data loaded into signals:
  - tasks
  - notes
  - planningItems
  - activities
  - novels
    ↓
UI renders with computed values
    ↓
User interactions trigger CRUD operations
    ↓
Updates propagate to DB and UI simultaneously
```

**Desktop-Specific Features**:
- Voice command input (Speech Recognition API)
- Real-time performance metrics
- File upload/attachment handling
- Command execution system

**Web-Specific Features**:
- Calendar view (month/2-week modes)
- Planning board
- Auto-schedule toggle
- Simplified dashboard

**Services Used**:
- `StoreService`: Central data store
- `UserService`: User profile and preferences
- `NotificationService`: System notifications
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Operations**:
- **Read**: Load all tasks, notes, activities on init
- **Create**: Add new tasks via voice/text commands
- **Update**: Real-time updates to task status
- **Delete**: Move items to bin

---

### 3. Novels

**Route**: `/novels` (list), `/novels/:id` (editor)

**Components**:
- `NovelsComponent`: Novel list/grid view
- `NovelEditorComponent`: Full-screen editor

**Data Flow**:
```
NovelsComponent Init
    ↓
Load novels from StoreService.novels signal
    ↓
Display grid/list with metadata
    ↓
User clicks novel → Navigate to /novels/:id
    ↓
NovelEditorComponent Init
    ↓
NovelContentService.loadNovel(id)
    ↓
Desktop: SqliteService.getNovelContent(id)
Web: RxdbService.getNovelContent(id)
    ↓
TiptapEditor initialized with content
    ↓
User edits → Auto-save (debounced)
    ↓
NovelContentService.saveNovel(id, content)
    ↓
Update word count, chapters, progress
    ↓
Persist to DB
```

**Services Used**:
- `NovelContentService`: Novel content management
- `StoreService`: Novel metadata
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
Novel {
  id: string
  title: string
  icon: string
  status: 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED'
  wordCount: number
  targetWordCount: number
  progress: number
  chapters: number
  notesCount: number
  createdDate: string
  lastUpdated: string
  genre: string[]
  isRecentlyUpdated: boolean
  coverImage?: string
}

NovelContent {
  id: string  // same as novel id
  data: string  // HTML/JSON content
}
```

**Features**:
- Rich text editing with TiptapEditor
- Auto-save (1-second debounce)
- Word count tracking
- Chapter management
- Version history
- Export functionality

---

### 4. Daily Notes

**Route**: `/daily-notes`

**Component**: `DailyNotesComponent`

**Data Flow**:
```
Component Init
    ↓
Load notes from StoreService.notes signal
    ↓
Display note list (sorted by date)
    ↓
User creates new note
    ↓
StoreService.addNote(note)
    ↓
Save note metadata to DB
    ↓
Save note content to file system:
  Desktop: FileSystemService.saveNote(id, markdown)
  Web: IndexedDB via RxdbService
    ↓
User edits note
    ↓
StoreService.updateNote(id, updates)
    ↓
Debounced save (1 second)
    ↓
Convert HTML → Markdown (Turndown)
    ↓
Persist to file/DB
```

**Services Used**:
- `StoreService`: Note metadata and state
- `FileSystemService`: File I/O operations
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
Note {
  id: string
  date: string
  title: string
  preview: string
  content?: string  // HTML (in-memory cache)
  tags?: string[]
  lastEdited?: string
  filePath?: string  // Desktop only
  lastSynced?: string
}
```

**Content Storage Strategy**:
- **Metadata**: Stored in DB (SQLite/RxDB)
- **Content**: 
  - Desktop: Markdown files in app data directory
  - Web: HTML/Markdown in IndexedDB
- **Conversion**: HTML ↔ Markdown using `marked` and `turndown`

---

### 5. Tasks

**Route**: `/tasks`

**Component**: `TasksComponent`

**Data Flow**:
```
Component Init
    ↓
Load tasks from StoreService.tasks signal
    ↓
Display task list with filters
    ↓
User creates task
    ↓
StoreService.addTask(task)
    ↓
Desktop: SqliteService.upsertTask(task)
Web: RxdbService.upsertTask(task)
    ↓
Add activity log entry
    ↓
Update UI via signal
    ↓
User updates task status
    ↓
StoreService.updateTask(id, { status: 'COMPLETED' })
    ↓
Persist to DB
    ↓
Update activity log
```

**Services Used**:
- `StoreService`: Task state management
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
Task {
  id: string
  title: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  hours: string
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING'
  project?: string
  due?: string
  labels?: string[]
  reminders?: string[]
  subtasks?: Task[]
  parentId?: string
  dependencies?: string[]
  recurring?: RecurringPattern
  timeSpent?: number
  notes?: string
  attachments?: Attachment[]
  description?: string
  startDate?: string
  estimatedDuration?: number
}
```

**Features**:
- Hierarchical tasks (subtasks)
- Task dependencies
- Recurring tasks
- Time tracking
- Labels and reminders
- File attachments

---

### 6. Journals

**Route**: `/journals`

**Component**: `JournalsComponent`

**Data Flow**:
```
Component Init
    ↓
JournalService.loadProjects()
    ↓
Desktop: SqliteService.getAllJournalProjects()
Web: RxdbService.getAll('journal_projects')
    ↓
Display project list
    ↓
User selects project
    ↓
JournalService.loadEntries(projectId)
    ↓
Desktop: SqliteService.getAllJournalEntries()
Web: RxdbService.getAll('journal_entries')
    ↓
Filter entries by projectId
    ↓
Display Kanban board with columns
    ↓
User creates entry
    ↓
JournalService.createEntry(entry)
    ↓
Persist to DB
    ↓
Update project stats (word count, entry count)
```

**Services Used**:
- `JournalService`: Journal management
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
JournalProject {
  id: string
  title: string
  description: string
  entriesCount: number
  active: boolean
  wordCount: number
  targetWordCount: number
  progress: number
  createdDate: string
  lastUpdated: string
  columns: Column[]
  tags: string[]
  isLocked: boolean
}

JournalEntry {
  id: string
  projectId: string
  title: string
  content: string
  preview: string
  type: string
  column: string
  tags: string[]
  wordCount: number
  characterCount: number
  createdDate: string
  lastEdited: string
  hasAi: boolean
  isAiEdited: boolean
  progress: number
  statusColor: string
  meta: object
  isLocked: boolean
  linkedEntries: string[]
  isPinned: boolean
  isFavorite: boolean
}
```

**Features**:
- Kanban board view
- Custom columns
- Entry linking
- AI assistance tracking
- Word count tracking
- Lock/unlock entries

---

### 7. Research

**Route**: `/research`

**Component**: `ResearchComponent`

**Data Flow**:
```
Component Init
    ↓
ResearchService.loadLibraries()
    ↓
Desktop: SqliteService.getAllResearchLibraries()
Web: RxdbService.getAll('research_libraries')
    ↓
Display library list
    ↓
User selects library
    ↓
ResearchService.loadSources(libraryId)
    ↓
Load sources and summaries
    ↓
Display in organized view
    ↓
User adds source
    ↓
ResearchService.addSource(source)
    ↓
Persist to DB
    ↓
Update library metadata
```

**Services Used**:
- `ResearchService`: Research management
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
ResearchLibrary {
  id: string
  name: string
  description: string
  color: string
  createdDate: string
  lastModified: string
}

ResearchSource {
  id: string
  libraryId: string
  title: string
  sourceType: string
  url: string
  description: string
  author: string
  publishDate: string
  tags: string[]
  status: string
  notes: string
  createdDate: string
  lastAccessed: string
}

ResearchSummary {
  id: string
  libraryId: string
  title: string
  content: string
  sourceIds: string[]
  tags: string[]
  createdDate: string
  lastModified: string
}
```

---

### 8. Articles

**Route**: `/articles`

**Component**: `ArticlesComponent`

**Data Flow**:
```
Component Init
    ↓
ArticleService.loadArticles()
    ↓
Desktop: SqliteService.getAllArticles()
Web: RxdbService.getAll('articles')
    ↓
Display article list with pipeline status
    ↓
User creates article
    ↓
ArticleService.createArticle(article)
    ↓
Persist to DB
    ↓
User edits article
    ↓
ArticleService.updateArticle(id, updates)
    ↓
Update word count, engagement metrics
    ↓
Persist changes
```

**Services Used**:
- `ArticleService`: Article management
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
Article {
  id: string
  title: string
  platform: string
  pipeline: string
  wordCount: number
  content: string
  url: string
  scheduledDate: string
  engagement: object
  tags: string[]
  lastUpdated: string
  createdDate: string
  icon: string
  excerpt: string
}
```

---

### 9. Meetings

**Route**: `/meetings`

**Component**: `MeetingsComponent`

**Data Flow**:
```
Component Init
    ↓
MeetingsService.loadMeetings()
    ↓
Desktop: SqliteService.getAllMeetings()
Web: RxdbService.getAll('meetings')
    ↓
Display calendar/list view
    ↓
User creates meeting
    ↓
MeetingsService.createMeeting(meeting)
    ↓
Persist to DB
    ↓
Set reminders
    ↓
User joins meeting
    ↓
Open meeting link
    ↓
Track attendance
```

**Services Used**:
- `MeetingsService`: Meeting management
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
Meeting {
  id: string
  title: string
  description: string
  project: string
  date: string
  startTime: string
  endTime: string
  duration: number
  timezone: string
  location: string
  meetingLink: string
  meetingType: string
  platform: string
  attendees: Attendee[]
  organizer: Person
  agenda: AgendaItem[]
  notes: Note[]
  actionItems: ActionItem[]
  status: string
  priority: string
  color: string
  labels: string[]
  recurring: RecurringPattern
  reminders: Reminder[]
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
  createdBy: string
}
```

---

### 10. Books

**Route**: `/books`

**Component**: `BooksComponent`

**Data Flow**:
```
Component Init
    ↓
BooksService.loadBooks()
    ↓
Desktop: SqliteService.getAllBooks()
Web: RxdbService.getAll('books')
    ↓
Display book library
    ↓
User adds book
    ↓
BooksService.addBook(book)
    ↓
Persist to DB
    ↓
User updates reading progress
    ↓
BooksService.updateProgress(id, progress)
    ↓
Update book metadata
    ↓
Persist changes
```

**Services Used**:
- `BooksService`: Book management
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
Book {
  id: string
  title: string
  author: string
  category: string
  status: string
  progress: number
  notesCount: number
  lastAccessed: string
  coverImage: string
  isbn: string
  year: number
  notes: string
  createdAt: string
  updatedAt: string
}
```

---

### 11. Code Snippets

**Route**: `/snippets`

**Component**: `CodeSnippetsComponent`

**Data Flow**:
```
Component Init
    ↓
SnippetsService.loadSnippets()
    ↓
Desktop: SqliteService.getAllSnippets()
Web: RxdbService.getAll('snippets')
    ↓
Display snippet library
    ↓
User creates snippet
    ↓
SnippetsService.createSnippet(snippet)
    ↓
Persist to DB
    ↓
User searches snippets
    ↓
Filter by language/tags
    ↓
Display filtered results
```

**Services Used**:
- `SnippetsService`: Snippet management
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
Snippet {
  id: string
  title: string
  lang: string
  tags: string[]
  content: string
  filename: string
  path: string
  creator: string
  createdAt: string
  updatedAt: string
}
```

---

### 12. Activity Log

**Route**: `/activity-log`

**Component**: `ActivityLogComponent`

**Data Flow**:
```
Component Init
    ↓
Load activities from StoreService.activities signal
    ↓
Display chronological activity feed
    ↓
Auto-update when new activities added
    ↓
Filter by activity type
    ↓
Display filtered results
```

**Services Used**:
- `StoreService`: Activity state

**Data Schema**:
```typescript
Activity {
  id: string
  text: string
  time: string
  type: 'entry' | 'sync' | 'ai' | 'system'
}
```

**Activity Sources**:
- Task creation/updates
- Note creation/updates
- Novel creation
- Project creation
- System events

---

### 13. Bin (Recycle Bin)

**Route**: `/bin`

**Component**: `BinComponent`

**Data Flow**:
```
Component Init
    ↓
BinService.loadBinItems()
    ↓
Desktop: SqliteService.getAllBinItems()
Web: RxdbService.getAll('bin_items')
    ↓
Display deleted items
    ↓
User restores item
    ↓
BinService.restore(item)
    ↓
Restore to original collection
    ↓
Remove from bin
    ↓
User permanently deletes
    ↓
BinService.permanentlyDelete(id)
    ↓
Remove from DB
```

**Services Used**:
- `BinService`: Bin management
- Desktop: `SqliteService`
- Web: `RxdbService`

**Data Schema**:
```typescript
BinItem {
  id: string
  type: string  // 'task', 'note', 'novel', etc.
  originalId: string
  contextId: string
  title: string
  deletedAt: string
  payload: object  // Original item data
}
```

---

### 14. Developer Settings

**Route**: `/developer-settings`

**Component**: `DeveloperSettingsComponent`

**Data Flow**:
```
Component Init
    ↓
Load current settings from services
    ↓
Display configuration options
    ↓
User updates settings
    ↓
Persist to localStorage/DB
    ↓
Apply settings immediately
```

**Settings Categories**:
- AI Configuration (LangChain providers)
- Theme preferences
- Storage preferences
- Debug mode
- Performance monitoring

---

## Core Services

### 1. StoreService
**Purpose**: Central state management for core data types

**Responsibilities**:
- Manage signals for tasks, notes, novels, activities, planning items
- CRUD operations for all data types
- Coordinate with persistence layer
- Activity logging
- File content management (notes)

**Key Methods**:
- `addTask(task)`, `updateTask(id, updates)`, `deleteTask(id)`
- `addNote(note)`, `updateNote(id, updates)`, `deleteNote(id)`
- `loadNoteContent(id)` - Load and convert markdown to HTML
- `addNovel(novel)`, `deleteNovel(id)`
- `addActivity(text, type)`

**Data Flow**:
```
Component → StoreService → Persistence Layer → DB
                ↓
            Signal Update
                ↓
            UI Auto-Update
```

---

### 2. SqliteService (Desktop)
**Purpose**: SQLite database management for desktop app

**Responsibilities**:
- Database initialization and table creation
- CRUD operations for all collections
- Reactive data via BehaviorSubjects
- JSON field serialization/deserialization
- Migration support

**Key Features**:
- 17 tables (tasks, notes, novels, articles, etc.)
- Automatic data reload after mutations
- Observable streams for reactive UI
- Tauri-only (graceful degradation in browser)

**Collections**:
- tasks, notes, planning_items, activities
- novels, novel_content
- bin_items, snippets, books, meetings
- articles, journal_projects, journal_entries, journal_columns
- research_libraries, research_sources, research_summaries

---

### 3. RxdbService (Web)
**Purpose**: RxDB/IndexedDB management for web app

**Responsibilities**:
- RxDB database initialization
- Collection management
- Reactive queries via RxDB observables
- Generic CRUD helpers

**Key Features**:
- Dexie storage adapter
- 17 collections (same as desktop)
- Query builder plugin
- Update plugin
- Dev mode support

**Limitations**:
- Free version limited to 16 collections
- Browser storage limits
- No native file system access

---

### 4. FileSystemService
**Purpose**: File I/O operations

**Desktop Implementation**:
- Tauri FS plugin
- Native file system access
- Configurable storage directory
- Read/write markdown files

**Web Implementation**:
- Browser File System API
- IndexedDB fallback
- Limited file access

**Key Methods**:
- `saveNote(id, markdown)` - Save note as .md file
- `readNote(id)` - Read note content
- `deleteNote(id)` - Delete note file
- `getStorageDir()` - Get storage directory path

---

### 5. AuthService
**Desktop**: Full Supabase authentication
**Web**: Stub implementation

**Responsibilities**:
- User authentication
- Session management
- Token refresh
- Guest mode (desktop)

**Key Methods**:
- `login(email, password)`
- `signUp(email, password)`
- `logout()`
- `refreshToken()`
- `loginAsGuest()` (desktop only)

---

### 6. NovelContentService
**Purpose**: Novel content management

**Responsibilities**:
- Load/save novel content
- Chapter management
- Word count tracking
- Auto-save with debouncing
- Version history

**Key Methods**:
- `loadNovel(id)` - Load novel content
- `saveNovel(id, content)` - Save with auto-save
- `updateWordCount(id)` - Recalculate stats
- `exportNovel(id, format)` - Export to various formats

---

### 7. JournalService
**Purpose**: Journal project and entry management

**Responsibilities**:
- Project CRUD
- Entry CRUD
- Column management
- Entry linking
- Statistics calculation

---

### 8. ResearchService
**Purpose**: Research library management

**Responsibilities**:
- Library CRUD
- Source CRUD
- Summary CRUD
- Organization and categorization

---

### 9. ArticleService
**Purpose**: Article management

**Responsibilities**:
- Article CRUD
- Pipeline tracking
- Engagement metrics
- Scheduling

---

### 10. MeetingsService
**Purpose**: Meeting management

**Responsibilities**:
- Meeting CRUD
- Calendar integration
- Reminder management
- Attendee tracking
- Action item tracking

---

### 11. BooksService
**Purpose**: Book library management

**Responsibilities**:
- Book CRUD
- Reading progress tracking
- Note taking
- Categorization

---

### 12. SnippetsService
**Purpose**: Code snippet management

**Responsibilities**:
- Snippet CRUD
- Language detection
- Tag management
- Search and filtering

---

### 13. BinService
**Purpose**: Recycle bin management

**Responsibilities**:
- Soft delete items
- Restore functionality
- Permanent deletion
- Auto-cleanup (optional)

---

### 14. UserService
**Purpose**: User profile and preferences

**Responsibilities**:
- User profile management
- Preferences storage
- Statistics tracking
- Theme preferences

---

### 15. NotificationService
**Purpose**: System notifications

**Desktop**: Tauri notification plugin
**Web**: Browser Notification API

**Responsibilities**:
- Show notifications
- Permission management
- Notification history

---

### 16. AIService
**Purpose**: AI integration

**Responsibilities**:
- LangChain integration
- Multiple provider support (OpenAI, Anthropic, Ollama)
- Local model support
- Prompt management

---

## Data Persistence Layer

### Desktop (SQLite)

**Database**: `envello.db`
**Location**: Tauri app data directory

**Architecture**:
```
Component
    ↓
Service (Business Logic)
    ↓
StoreService (State Management)
    ↓
SqliteService (Persistence)
    ↓
Tauri SQL Plugin
    ↓
SQLite Database
```

**Tables** (17 total):
1. tasks
2. notes
3. planning_items
4. activities
5. novels
6. novel_content
7. bin_items
8. snippets
9. books
10. meetings
11. articles
12. journal_projects
13. journal_entries
14. journal_columns
15. research_libraries
16. research_sources
17. research_summaries

**Features**:
- ACID compliance
- Relational queries
- JSON field support
- Full-text search (potential)
- Backup/restore capability

---

### Web (RxDB/IndexedDB)

**Database**: `envello_db_v3`
**Location**: Browser IndexedDB

**Architecture**:
```
Component
    ↓
Service (Business Logic)
    ↓
StoreService (State Management)
    ↓
RxdbService (Persistence)
    ↓
RxDB
    ↓
Dexie (IndexedDB Wrapper)
    ↓
Browser IndexedDB
```

**Collections** (17 total):
Same as desktop tables

**Features**:
- Reactive queries
- Observable data streams
- Multi-tab support
- Offline-first
- Browser storage limits apply

**Limitations**:
- Free version: 16 collection limit (currently using 17!)
- Storage quota limits
- No relational queries
- Performance varies by browser

---

## Data Synchronization

### Current State
- **Desktop**: Local-only (SQLite)
- **Web**: Local-only (IndexedDB)
- **No cloud sync** currently implemented

### Potential Sync Strategy
```
Local DB (SQLite/RxDB)
    ↓
Sync Service
    ↓
Supabase (PostgreSQL)
    ↓
Real-time subscriptions
    ↓
Other devices
```

**Considerations**:
- Conflict resolution
- Offline changes
- Incremental sync
- Large file handling (novels)

---

## Performance Considerations

### Desktop
- SQLite is fast for local operations
- File system access for large content
- Native performance via Tauri
- Memory-efficient reactive streams

### Web
- IndexedDB has size limits
- Browser performance varies
- Network latency for Supabase (if implemented)
- Memory constraints for large datasets

### Optimization Strategies
1. **Lazy Loading**: Load content on-demand
2. **Debounced Saves**: Reduce write frequency
3. **Pagination**: Limit initial data load
4. **Caching**: In-memory caching for frequently accessed data
5. **Virtual Scrolling**: For large lists
6. **Web Workers**: Offload heavy processing

---

## Error Handling

### Database Errors
- Graceful degradation in non-Tauri environments
- Error logging via `LoggingService`
- User-friendly error messages
- Retry logic for transient failures

### File System Errors
- Fallback to database storage
- Permission error handling
- Disk space checks
- Corruption recovery

### Network Errors (Supabase)
- Offline mode support
- Request queuing
- Exponential backoff
- Connection status monitoring

---

## Security Considerations

### Desktop
- Local database encryption (potential)
- Secure file permissions
- Tauri security context
- No direct network exposure

### Web
- Browser security sandbox
- HTTPS only
- Content Security Policy
- XSS protection
- CSRF tokens (if backend added)

### Authentication
- Supabase JWT tokens
- Token refresh mechanism
- Secure session storage
- Guest mode isolation

---

## Future Enhancements

### Planned Features
1. **Cloud Sync**: Supabase integration for cross-device sync
2. **Collaboration**: Real-time collaborative editing
3. **Mobile Apps**: iOS/Android versions
4. **Export/Import**: Backup and migration tools
5. **Advanced Search**: Full-text search across all content
6. **AI Integration**: Enhanced AI features with LangChain
7. **Version Control**: Git-like versioning for novels
8. **Analytics**: Usage statistics and insights

### Technical Debt
1. **RxDB Collection Limit**: Upgrade to premium or consolidate collections
2. **Web Authentication**: Implement real auth for web version
3. **File System**: Improve web file handling
4. **Testing**: Add comprehensive unit and integration tests
5. **Documentation**: API documentation for services

---

## Conclusion

Envello is a sophisticated dual-platform application with a well-architected data flow system. The separation between web and desktop versions allows for platform-specific optimizations while maintaining code reusability. The use of Angular Signals provides reactive, performant state management, and the abstraction of persistence layers (SqliteService/RxdbService) ensures flexibility and maintainability.

Key strengths:
- ✅ Clean separation of concerns
- ✅ Reactive state management
- ✅ Offline-first architecture
- ✅ Platform-specific optimizations
- ✅ Comprehensive feature set

Areas for improvement:
- ⚠️ Cloud synchronization
- ⚠️ RxDB collection limit
- ⚠️ Web authentication
- ⚠️ Test coverage
- ⚠️ Performance optimization for large datasets
