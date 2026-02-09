# Envello App - Feature & Data Flow Comparison

## Desktop vs Web - Complete Feature Matrix

| Feature/Aspect | Desktop (Tauri) | Web (Browser) | Notes |
|----------------|-----------------|---------------|-------|
| **Entry Route** | `/login` | `/overview` | Desktop requires auth, Web direct access |
| **Authentication** | ✅ Supabase + Guest Mode | ⚠️ Stub (auto-auth in dev) | Desktop has full auth flow |
| **Database** | SQLite (`envello.db`) | RxDB (IndexedDB) | Both support 17 collections |
| **Storage Location** | Tauri app data directory | Browser IndexedDB | Desktop has persistent storage |
| **File System** | ✅ Native FS (.md files) | ⚠️ Browser FS API + IndexedDB | Desktop has full file access |
| **Offline Support** | ✅ Full offline | ✅ Full offline | Both are offline-first |
| **Cloud Sync** | ❌ Not implemented | ❌ Not implemented | Future feature |
| **Voice Commands** | ✅ Speech Recognition | ❌ Not available | Desktop-only feature |
| **File Uploads** | ✅ Native file picker | ⚠️ Browser file picker | Desktop has better integration |
| **Notifications** | ✅ Tauri plugin | ⚠️ Browser API | Desktop has native notifications |
| **Performance Metrics** | ✅ Real-time monitoring | ❌ Not available | Desktop-only feature |
| **Calendar View** | ❌ Not available | ✅ Month/2-week modes | Web-only feature |
| **Planning Board** | ❌ Not available | ✅ Available | Web-only feature |
| **Auto-Schedule** | ❌ Not available | ✅ Toggle available | Web-only feature |

---

## Page-by-Page Feature Comparison

### 1. Login/Signup
| Aspect | Desktop | Web |
|--------|---------|-----|
| **Available** | ✅ Yes | ❌ No |
| **Auth Provider** | Supabase | N/A |
| **Guest Mode** | ✅ Yes | N/A |
| **Social Login** | ✅ Google, GitHub | N/A |
| **Email/Password** | ✅ Yes | N/A |

**Desktop Data Flow**:
```
User Input → LoginComponent → AuthService → Supabase
→ Session stored → Navigate to /workspace
```

---

### 2. Workspace (Desktop) / Overview (Web)

| Feature | Desktop (Workspace) | Web (Overview) |
|---------|---------------------|----------------|
| **Voice Commands** | ✅ Yes | ❌ No |
| **Speech Recognition** | ✅ Yes | ❌ No |
| **File Uploads** | ✅ Yes | ⚠️ Limited |
| **Performance Metrics** | ✅ Real-time | ❌ No |
| **Calendar View** | ❌ No | ✅ Month/2-week |
| **Planning Board** | ❌ No | ✅ Yes |
| **Auto-Schedule** | ❌ No | ✅ Toggle |
| **Task List** | ✅ Yes | ✅ Yes |
| **Activity Feed** | ✅ Yes | ✅ Yes |
| **Quick Stats** | ✅ Yes | ✅ Yes |

**Desktop Unique Features**:
- Voice command input: "Create task", "Open novels", etc.
- Real-time performance monitoring (CPU, memory, latency)
- File attachment handling
- Command execution system

**Web Unique Features**:
- Calendar view with month/2-week toggle
- Planning board with drag-and-drop
- Auto-schedule toggle for tasks
- Streak visualization with color tiers

**Shared Data Flow**:
```
Component Init → StoreService.load() → DB Query
→ Signal Update → UI Render

User Action → Service.update() → Signal Update (immediate)
→ DB Persist (async) → Activity Log
```

---

### 3. Novels

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Novel List** | ✅ Grid/List | ✅ Grid/List | Same UI |
| **Novel Editor** | ✅ TiptapEditor | ✅ TiptapEditor | Same editor |
| **Auto-Save** | ✅ 1s debounce | ✅ 1s debounce | Same behavior |
| **Word Count** | ✅ Real-time | ✅ Real-time | Same tracking |
| **Chapter Management** | ✅ Yes | ✅ Yes | Same features |
| **Version History** | ✅ Yes | ✅ Yes | Same features |
| **Export** | ✅ Multiple formats | ✅ Multiple formats | Same options |
| **Content Storage** | SQLite + FS | RxDB (IndexedDB) | Different storage |
| **File Size Limit** | ⚠️ Disk space | ⚠️ Browser quota | Desktop has more space |

**Data Flow (Both Platforms)**:
```
List View:
  Load novels → Display grid/list → Click → Navigate to /novels/:id

Editor View:
  Load content → Initialize TiptapEditor → User edits
  → Auto-save (1s debounce) → Update word count
  → Persist to DB → Update metadata
```

**Storage Difference**:
- **Desktop**: Novel content in SQLite `novel_content` table
- **Web**: Novel content in RxDB `novel_content` collection

---

### 4. Daily Notes

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Note List** | ✅ Chronological | ✅ Chronological | Same UI |
| **Rich Text Editor** | ✅ TiptapEditor | ✅ TiptapEditor | Same editor |
| **Markdown Storage** | ✅ .md files | ⚠️ IndexedDB | Desktop uses files |
| **Auto-Save** | ✅ 1s debounce | ✅ 1s debounce | Same behavior |
| **Tags** | ✅ Yes | ✅ Yes | Same features |
| **Search** | ✅ Yes | ✅ Yes | Same features |
| **File Path** | ✅ Tracked in DB | ❌ N/A | Desktop-only |

**Data Flow**:
```
Desktop:
  Load metadata from SQLite → Load content from .md file
  → Convert Markdown → HTML → Display in editor
  → User edits → Convert HTML → Markdown
  → Save to .md file → Update metadata in SQLite

Web:
  Load metadata from RxDB → Load content from IndexedDB
  → Convert Markdown → HTML → Display in editor
  → User edits → Convert HTML → Markdown
  → Save to IndexedDB → Update metadata in RxDB
```

**Key Difference**: Desktop stores note content in separate `.md` files, Web stores in IndexedDB.

---

### 5. Tasks

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Task List** | ✅ Yes | ✅ Yes | Same UI |
| **Subtasks** | ✅ Hierarchical | ✅ Hierarchical | Same structure |
| **Dependencies** | ✅ Yes | ✅ Yes | Same features |
| **Recurring Tasks** | ✅ Yes | ✅ Yes | Same patterns |
| **Time Tracking** | ✅ Yes | ✅ Yes | Same tracking |
| **Attachments** | ✅ Yes | ⚠️ Limited | Desktop has better support |
| **Reminders** | ✅ Native | ⚠️ Browser | Desktop has native reminders |

**Data Flow (Both Platforms)**:
```
Load tasks → Display with filters → User creates task
→ StoreService.addTask() → Persist to DB
→ Add activity log → Signal update → UI refresh

User updates status → StoreService.updateTask()
→ Persist to DB → Activity log → Signal update
```

**Storage**: Same schema in both SQLite and RxDB.

---

### 6. Journals

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Project Management** | ✅ Yes | ✅ Yes | Same features |
| **Kanban Board** | ✅ Yes | ✅ Yes | Same UI |
| **Custom Columns** | ✅ Yes | ✅ Yes | Same features |
| **Entry Linking** | ✅ Yes | ✅ Yes | Same features |
| **AI Tracking** | ✅ Yes | ✅ Yes | Same features |
| **Word Count** | ✅ Yes | ✅ Yes | Same tracking |

**Data Flow (Both Platforms)**:
```
Load projects → Select project → Load entries
→ Display Kanban board → User creates entry
→ JournalService.createEntry() → Persist to DB
→ Update project stats → Signal update
```

**Storage**: Same schema in both platforms (3 tables/collections).

---

### 7. Research

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Library Management** | ✅ Yes | ✅ Yes | Same features |
| **Source Tracking** | ✅ Yes | ✅ Yes | Same features |
| **Summaries** | ✅ Yes | ✅ Yes | Same features |
| **Tags** | ✅ Yes | ✅ Yes | Same features |
| **Organization** | ✅ Yes | ✅ Yes | Same features |

**Data Flow (Both Platforms)**:
```
Load libraries → Select library → Load sources/summaries
→ Display organized view → User adds source
→ ResearchService.addSource() → Persist to DB
→ Update library metadata → Signal update
```

**Storage**: Same schema in both platforms (3 tables/collections).

---

### 8. Articles

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Article Management** | ✅ Yes | ✅ Yes | Same features |
| **Pipeline Tracking** | ✅ Yes | ✅ Yes | Same features |
| **Engagement Metrics** | ✅ Yes | ✅ Yes | Same features |
| **Scheduling** | ✅ Yes | ✅ Yes | Same features |
| **Word Count** | ✅ Yes | ✅ Yes | Same tracking |

**Data Flow (Both Platforms)**:
```
Load articles → Display pipeline → User creates article
→ ArticleService.createArticle() → Persist to DB
→ Update metrics → Signal update
```

---

### 9. Meetings

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Meeting Management** | ✅ Yes | ✅ Yes | Same features |
| **Calendar Integration** | ✅ Yes | ✅ Yes | Same features |
| **Attendee Tracking** | ✅ Yes | ✅ Yes | Same features |
| **Agenda Management** | ✅ Yes | ✅ Yes | Same features |
| **Action Items** | ✅ Yes | ✅ Yes | Same features |
| **Reminders** | ✅ Native | ⚠️ Browser | Desktop has native reminders |

**Data Flow (Both Platforms)**:
```
Load meetings → Display calendar/list → User creates meeting
→ MeetingsService.createMeeting() → Persist to DB
→ Set reminders → Signal update
```

---

### 10. Books

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Book Library** | ✅ Yes | ✅ Yes | Same features |
| **Reading Progress** | ✅ Yes | ✅ Yes | Same tracking |
| **Note Taking** | ✅ Yes | ✅ Yes | Same features |
| **Categorization** | ✅ Yes | ✅ Yes | Same features |

**Data Flow (Both Platforms)**:
```
Load books → Display library → User adds book
→ BooksService.addBook() → Persist to DB
→ User updates progress → Update metadata
→ Signal update
```

---

### 11. Code Snippets

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Snippet Management** | ✅ Yes | ✅ Yes | Same features |
| **Language Detection** | ✅ Yes | ✅ Yes | Same features |
| **Tag Management** | ✅ Yes | ✅ Yes | Same features |
| **Search** | ✅ Yes | ✅ Yes | Same features |

**Data Flow (Both Platforms)**:
```
Load snippets → Display library → User creates snippet
→ SnippetsService.createSnippet() → Persist to DB
→ Signal update
```

---

### 12. Activity Log

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Activity Feed** | ✅ Yes | ✅ Yes | Same UI |
| **Activity Types** | ✅ 4 types | ✅ 4 types | entry, sync, ai, system |
| **Auto-Update** | ✅ Yes | ✅ Yes | Same behavior |
| **Filtering** | ✅ Yes | ✅ Yes | Same features |

**Data Flow (Both Platforms)**:
```
Load activities → Display chronological feed
→ Auto-update on new activities → Filter by type
```

**Activity Sources**: Task/Note/Novel creation, System events

---

### 13. Bin (Recycle Bin)

| Feature | Desktop | Web | Notes |
|---------|---------|-----|-------|
| **Soft Delete** | ✅ Yes | ✅ Yes | Same behavior |
| **Restore** | ✅ Yes | ✅ Yes | Same features |
| **Permanent Delete** | ✅ Yes | ✅ Yes | Same features |
| **Auto-Cleanup** | ⚠️ Optional | ⚠️ Optional | Not implemented |

**Data Flow (Both Platforms)**:
```
Load bin items → Display deleted items
→ User restores → BinService.restore()
→ Restore to original collection → Remove from bin
→ Signal update

User permanently deletes → BinService.permanentlyDelete()
→ Remove from DB → Signal update
```

---

## Service Layer Comparison

| Service | Desktop Implementation | Web Implementation | Differences |
|---------|------------------------|-------------------|-------------|
| **StoreService** | ✅ Same | ✅ Same | Identical logic |
| **Persistence** | SqliteService | RxdbService | Different DB layer |
| **FileSystemService** | Native FS (Tauri) | Browser FS API + IndexedDB | Desktop has full access |
| **AuthService** | Supabase + Guest | Stub (auto-auth) | Desktop has real auth |
| **NovelContentService** | ✅ Same | ✅ Same | Identical logic |
| **JournalService** | ✅ Same | ✅ Same | Identical logic |
| **ResearchService** | ✅ Same | ✅ Same | Identical logic |
| **ArticleService** | ✅ Same | ✅ Same | Identical logic |
| **MeetingsService** | ✅ Same | ✅ Same | Identical logic |
| **BooksService** | ✅ Same | ✅ Same | Identical logic |
| **SnippetsService** | ✅ Same | ✅ Same | Identical logic |
| **BinService** | ✅ Same | ✅ Same | Identical logic |
| **UserService** | ✅ Same | ✅ Same | Identical logic |
| **NotificationService** | Tauri plugin | Browser API | Different implementation |
| **AIService** | ✅ Same | ✅ Same | Identical logic |

---

## Data Storage Comparison

### Desktop (SQLite)

**Database**: `envello.db`
**Location**: `~/.local/share/com.envello.app/` (Linux/Mac) or `%APPDATA%\com.envello.app\` (Windows)

**Tables** (17):
```sql
tasks, notes, planning_items, activities
novels, novel_content
bin_items, snippets, books, meetings
articles
journal_projects, journal_entries, journal_columns
research_libraries, research_sources, research_summaries
```

**File Storage**:
- Notes: `.md` files in `notes/` directory
- Novels: Content in `novel_content` table (could be moved to files)

**Advantages**:
- ✅ No storage limits (disk space only)
- ✅ Fast queries
- ✅ ACID compliance
- ✅ Relational queries
- ✅ Full-text search (potential)
- ✅ Backup/restore capability

**Disadvantages**:
- ⚠️ Desktop-only
- ⚠️ No cloud sync (yet)
- ⚠️ Single user

---

### Web (RxDB/IndexedDB)

**Database**: `envello_db_v3`
**Location**: Browser IndexedDB

**Collections** (17):
```
tasks, notes, planning_items, activities
novels, novel_content
bin_items, snippets, books, meetings
articles
journal_projects, journal_entries, journal_columns
research_libraries, research_sources, research_summaries
files (for file content storage)
```

**Advantages**:
- ✅ Cross-browser
- ✅ Reactive observables
- ✅ Multi-tab support
- ✅ Offline-first

**Disadvantages**:
- ⚠️ **Collection limit**: Free version supports 16, using 17!
- ⚠️ Storage quota limits (varies by browser)
- ⚠️ No relational queries
- ⚠️ Performance varies by browser
- ⚠️ Can be cleared by user/browser

---

## Performance Comparison

| Aspect | Desktop | Web | Winner |
|--------|---------|-----|--------|
| **Database Speed** | ⚡ Very Fast (SQLite) | ⚡ Fast (IndexedDB) | Desktop |
| **File I/O** | ⚡ Native FS | ⚠️ Browser API | Desktop |
| **Memory Usage** | ⚡ Efficient | ⚠️ Browser limits | Desktop |
| **Startup Time** | ⚡ Fast | ⚡ Fast | Tie |
| **Large Datasets** | ✅ Handles well | ⚠️ Browser limits | Desktop |
| **Concurrent Operations** | ✅ Excellent | ⚠️ Good | Desktop |

---

## Security Comparison

| Aspect | Desktop | Web | Notes |
|--------|---------|-----|-------|
| **Data Encryption** | ⚠️ Not implemented | ⚠️ Not implemented | Future feature |
| **Authentication** | ✅ Supabase JWT | ⚠️ Stub | Desktop has real auth |
| **Session Management** | ✅ Secure tokens | ❌ N/A | Desktop only |
| **File Permissions** | ✅ OS-level | ⚠️ Browser sandbox | Desktop more secure |
| **Network Isolation** | ✅ Tauri security | ⚠️ Browser security | Both secure |

---

## Deployment Comparison

| Aspect | Desktop | Web | Notes |
|--------|---------|-----|-------|
| **Build Command** | `npm run build` | `npm run build:web` | Different targets |
| **Output** | Tauri app bundle | Static files | Different formats |
| **Distribution** | App stores, direct download | Vercel, Netlify, etc. | Different channels |
| **Updates** | App update mechanism | Instant (reload) | Web is easier |
| **Installation** | Required | Not required | Web is easier |

---

## Future Roadmap Comparison

### Desktop Priorities
1. ✅ Cloud sync (Supabase)
2. ✅ Enhanced voice commands
3. ✅ Native file system improvements
4. ✅ Performance optimizations
5. ✅ Database encryption

### Web Priorities
1. 🔴 **Fix RxDB collection limit** (critical!)
2. ✅ Real authentication
3. ✅ Cloud sync (Supabase)
4. ✅ Service worker for offline
5. ✅ Progressive Web App (PWA)

### Shared Priorities
1. ✅ Full-text search
2. ✅ Export/import tools
3. ✅ Collaboration features
4. ✅ Mobile apps (iOS/Android)
5. ✅ Advanced AI features

---

## Recommendation: Which Version to Use?

### Use Desktop If:
- ✅ You need offline-first with no storage limits
- ✅ You want voice commands
- ✅ You need native file system access
- ✅ You prefer a native app experience
- ✅ You need better performance for large datasets

### Use Web If:
- ✅ You want instant access (no installation)
- ✅ You need cross-platform (any OS with browser)
- ✅ You want easier updates
- ✅ You prefer calendar/planning views
- ✅ You don't need large storage

### Ideal Setup:
Use **both**! Desktop for primary work, Web for quick access on other devices. Once cloud sync is implemented, data will sync seamlessly between them.

---

## Critical Issues to Address

### Web Version
1. 🔴 **RxDB Collection Limit**: Currently using 17 collections, free version supports 16
   - **Solution**: Upgrade to RxDB Premium OR consolidate collections
   - **Impact**: App may not work correctly in web version

2. ⚠️ **No Real Authentication**: Stub auth only
   - **Solution**: Implement Supabase auth for web
   - **Impact**: No user accounts, no cloud sync

### Desktop Version
1. ⚠️ **No Cloud Sync**: Local-only storage
   - **Solution**: Implement Supabase sync
   - **Impact**: No cross-device sync

### Both Versions
1. ⚠️ **No Collaboration**: Single-user only
   - **Solution**: Implement real-time collaboration
   - **Impact**: Can't share/collaborate on projects

2. ⚠️ **Limited Search**: No full-text search
   - **Solution**: Implement full-text search
   - **Impact**: Hard to find content in large datasets

---

## Conclusion

Envello has excellent architecture with clear separation between web and desktop versions. The main differences are:

**Desktop Strengths**:
- Native performance
- Full file system access
- Voice commands
- Real authentication
- No storage limits

**Web Strengths**:
- Instant access
- Cross-platform
- Easier updates
- Calendar/planning views
- No installation required

**Shared Strengths**:
- Offline-first
- Reactive state management
- Rich feature set
- Clean architecture
- Comprehensive data model

The data flow is consistent across both platforms, with the main difference being the persistence layer. Once cloud sync is implemented, both versions will complement each other perfectly.
