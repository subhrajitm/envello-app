# Envello AI Context (Codebase Structure)

This document is auto-generated to provide an LLM or AI agent with the entire structural schema of the workspace, excluding implementation details.

## File: /dist/shared/core/index.d.ts

### Class: EventBus
```typescript
class EventBus {
  ɵfac: i0.ɵɵFactoryDeclaration<EventBus, never>;
  ɵprov: i0.ɵɵInjectableDeclaration<EventBus>;
  dispatch(event: Omit<DomainEvent, 'timestamp'>): void;
  on(eventType: string): rxjs.Observable<T>;
  getEventLog(): i0.Signal<DomainEvent[]>;
  logEvents(): void;
  clearLog(): void;
}
```

### Class: EventLogComponent
```typescript
class EventLogComponent {
  events: i0.Signal<_envello_shared_core.DomainEvent[]>;
  isMinimized: boolean;
  ɵfac: i0.ɵɵFactoryDeclaration<EventLogComponent, never>;
  ɵcmp: i0.ɵɵComponentDeclaration<EventLogComponent, "app-event-log", never, {}, {}, never, never, true, never>;
  formatTime(timestamp: number): string;
  formatPayload(payload: any): string;
  clear(): void;
  logToConsole(): void;
  toggle(): void;
}
```

### Interface: DomainEvent
```typescript
interface DomainEvent {
  type: string;
  payload: any;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}
```

---

## File: /dist/shared/data/index.d.ts

### Class: PersistenceAdapter
```typescript
class PersistenceAdapter {
  loadTasks(): Promise<Task[]>;
  upsertTask(task: Task): Promise<void>;
  removeTask(id: string): Promise<void>;
  loadNotes(): Promise<Note[]>;
  upsertNote(note: Note): Promise<void>;
  removeNote(id: string): Promise<void>;
  loadNoteContent(id: string): Promise<string>;
  saveNoteContent(id: string, content: string): Promise<string>;
  removeNoteContent(id: string): Promise<void>;
}
```

### Class: TaskPersistenceEffect
```typescript
class TaskPersistenceEffect {
  ɵfac: i0.ɵɵFactoryDeclaration<TaskPersistenceEffect, never>;
  ɵprov: i0.ɵɵInjectableDeclaration<TaskPersistenceEffect>;
}
```

### Class: NotePersistenceEffect
```typescript
class NotePersistenceEffect {
  ɵfac: i0.ɵɵFactoryDeclaration<NotePersistenceEffect, never>;
  ɵprov: i0.ɵɵInjectableDeclaration<NotePersistenceEffect>;
}
```

---

## File: /dist/shared/domain/index.d.ts

### Class: TaskCommands
```typescript
class TaskCommands {
  ɵfac: i0.ɵɵFactoryDeclaration<TaskCommands, never>;
  ɵprov: i0.ɵɵInjectableDeclaration<TaskCommands>;
  createTask(task: Task): void;
  updateTask(id: string, updates: Partial<Task>): void;
  deleteTask(id: string): void;
  changeStatus(id: string, newStatus: Task['status']): void;
  changePriority(id: string, newPriority: Task['priority']): void;
  completeTask(id: string): void;
  uncompleteTask(id: string): void;
}
```

### Class: NoteCommands
```typescript
class NoteCommands {
  ɵfac: i0.ɵɵFactoryDeclaration<NoteCommands, never>;
  ɵprov: i0.ɵɵInjectableDeclaration<NoteCommands>;
  createNote(note: Note): void;
  updateNote(id: string, updates: Partial<Note>): void;
  deleteNote(id: string): void;
  loadNoteContent(id: string): void;
  addTag(id: string, tag: string): void;
  removeTag(id: string, tag: string): void;
}
```

### Interface: Task
```typescript
interface Task {
  id: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  hours: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
  project?: string;
  due?: string;
  labels?: string[];
  reminders?: string[];
  subtasks?: Task[];
  parentId?: string;
  dependencies?: string[];
  recurring?: {
        pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
        interval?: number;
        endDate?: string;
        nextDue?: string;
    };
  timeSpent?: number;
  notes?: string;
  attachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
        uploadedAt: string;
    }>;
  description?: string;
  startDate?: string;
  estimatedDuration?: number;
}
```

### Interface: TaskCreatedPayload
```typescript
interface TaskCreatedPayload {
  task: Task;
}
```

### Interface: TaskUpdatedPayload
```typescript
interface TaskUpdatedPayload {
  id: string;
  updates: Partial<Task>;
  previousState?: Partial<Task>;
}
```

### Interface: TaskDeletedPayload
```typescript
interface TaskDeletedPayload {
  id: string;
  task?: Task;
}
```

### Interface: TaskStatusChangedPayload
```typescript
interface TaskStatusChangedPayload {
  id: string;
  oldStatus: Task['status'];
  newStatus: Task['status'];
}
```

### Interface: TaskPriorityChangedPayload
```typescript
interface TaskPriorityChangedPayload {
  id: string;
  oldPriority: Task['priority'];
  newPriority: Task['priority'];
}
```

### Interface: Note
```typescript
interface Note {
  id: string;
  date: string;
  title: string;
  preview: string;
  content?: string;
  tags?: string[];
  lastEdited?: string;
  filePath?: string;
  lastSynced?: string;
}
```

### Interface: NoteCreatedPayload
```typescript
interface NoteCreatedPayload {
  note: Note;
}
```

### Interface: NoteUpdatedPayload
```typescript
interface NoteUpdatedPayload {
  id: string;
  updates: Partial<Note>;
  previousState?: Partial<Note>;
}
```

### Interface: NoteDeletedPayload
```typescript
interface NoteDeletedPayload {
  id: string;
  note?: Note;
}
```

### Interface: NoteLoadContentPayload
```typescript
interface NoteLoadContentPayload {
  id: string;
}
```

### Interface: NoteContentLoadedPayload
```typescript
interface NoteContentLoadedPayload {
  id: string;
  content: string;
}
```

### Interface: NoteContentSavedPayload
```typescript
interface NoteContentSavedPayload {
  id: string;
  filePath: string;
}
```

### Interface: NoteTagAddedPayload
```typescript
interface NoteTagAddedPayload {
  id: string;
  tag: string;
}
```

### Interface: NoteTagRemovedPayload
```typescript
interface NoteTagRemovedPayload {
  id: string;
  tag: string;
}
```

---

## File: /dist/shared/state/index.d.ts

### Class: TaskStore
```typescript
class TaskStore {
  tasks: _angular_core.Signal<Task[]>;
  activeTasks: _angular_core.Signal<Task[]>;
  completedTasks: _angular_core.Signal<Task[]>;
  pendingTasks: _angular_core.Signal<Task[]>;
  highPriorityTasks: _angular_core.Signal<Task[]>;
  tasksByProject: (projectId: string) => _angular_core.Signal<Task[]>;
  taskById: (id: string) => _angular_core.Signal<Task>;
  taskCount: _angular_core.Signal<number>;
  activeTaskCount: _angular_core.Signal<number>;
  completedTaskCount: _angular_core.Signal<number>;
  ɵfac: _angular_core.ɵɵFactoryDeclaration<TaskStore, never>;
  ɵprov: _angular_core.ɵɵInjectableDeclaration<TaskStore>;
  setTasks(tasks: Task[]): void;
  addTask(task: Task): void;
  updateTask(id: string, updates: Partial<Task>): void;
  removeTask(id: string): void;
  clearTasks(): void;
}
```

### Class: TaskReducer
```typescript
class TaskReducer {
  ɵfac: _angular_core.ɵɵFactoryDeclaration<TaskReducer, never>;
  ɵprov: _angular_core.ɵɵInjectableDeclaration<TaskReducer>;
}
```

### Class: NoteStore
```typescript
class NoteStore {
  notes: _angular_core.Signal<Note[]>;
  noteById: (id: string) => _angular_core.Signal<Note>;
  notesByTag: (tag: string) => _angular_core.Signal<Note[]>;
  pinnedNotes: _angular_core.Signal<Note[]>;
  recentNotes: _angular_core.Signal<Note[]>;
  noteCount: _angular_core.Signal<number>;
  taggedNoteCount: _angular_core.Signal<number>;
  ɵfac: _angular_core.ɵɵFactoryDeclaration<NoteStore, never>;
  ɵprov: _angular_core.ɵɵInjectableDeclaration<NoteStore>;
  setNotes(notes: Note[]): void;
  addNote(note: Note): void;
  updateNote(id: string, updates: Partial<Note>): void;
  removeNote(id: string): void;
  clearNotes(): void;
}
```

### Class: EditorStore
```typescript
class EditorStore {
  activeNoteId: _angular_core.Signal<string>;
  isDirty: _angular_core.Signal<boolean>;
  wordCount: _angular_core.Signal<number>;
  characterCount: _angular_core.Signal<number>;
  lastSaved: _angular_core.Signal<Date>;
  ɵfac: _angular_core.ɵɵFactoryDeclaration<EditorStore, never>;
  ɵprov: _angular_core.ɵɵInjectableDeclaration<EditorStore>;
  setActiveNote(id: string | null): void;
  setDirty(dirty: boolean): void;
  updateStats(wordCount: number, characterCount: number): void;
  markSaved(): void;
  clearEditor(): void;
}
```

### Class: NoteReducer
```typescript
class NoteReducer {
  ɵfac: _angular_core.ɵɵFactoryDeclaration<NoteReducer, never>;
  ɵprov: _angular_core.ɵɵInjectableDeclaration<NoteReducer>;
}
```

---

## File: /apps/admin/src/app/app.ts

### Class: App
```typescript
class App {
}
```

---

## File: /apps/admin/src/app/nx-welcome.ts

### Class: NxWelcome
```typescript
class NxWelcome {
}
```

---

## File: /apps/desktop/src/app/app.component.ts

### Class: AppComponent
```typescript
class AppComponent {
  title: any;
  authService: any;
  currentTab: any;
  hasSidebar: any;
  isImmersive: any;
  isFullScreen: any;
  sidebarCollapsed: any;
  navigationLayout: any;
  ngOnInit(): any;
  ngOnDestroy(): any;
  mapUrlToTabName(url: string): string;
  onSidebarCollapsedChange(collapsed: boolean): any;
}
```

---

## File: /apps/landing/src/app/app.ts

### Class: App
```typescript
class App {
}
```

---

## File: /apps/landing/src/app/nx-welcome.ts

### Class: NxWelcome
```typescript
class NxWelcome {
}
```

---

## File: /apps/web/src/app/app.component.ts

### Class: AppComponent
```typescript
class AppComponent {
  title: any;
  currentTab: any;
  hasSidebar: any;
  isImmersive: any;
  isFullScreen: any;
  sidebarCollapsed: any;
  navigationLayout: any;
  ngOnInit(): any;
  ngOnDestroy(): any;
  mapUrlToTabName(url: string): string;
  onSidebarCollapsedChange(collapsed: boolean): any;
}
```

---

## File: /libs/data/src/lib/data.service.ts

### Class: DataService
```typescript
class DataService {
  getAll(collection: string): Promise<T[]>;
  upsert(collection: string, item: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  importData(data: any): Promise<void>;
}
```

---

## File: /libs/domain/src/lib/models.ts

### Interface: IFileSystem
```typescript
interface IFileSystem {
  saveNote(id: string, content: string): Promise<string>;
  readNote(id: string): Promise<string | null>;
  deleteNote(id: string): Promise<void>;
}
```

### Interface: Task
```typescript
interface Task {
  id: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  hours: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
  project?: string;
  due?: string;
  labels?: string[];
  reminders?: string[];
  subtasks?: Task[];
  parentId?: string;
  dependencies?: string[];
  recurring?: {
        pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
        interval?: number;
        endDate?: string;
        nextDue?: string;
    };
  timeSpent?: number;
  notes?: string;
  attachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
        uploadedAt: string;
    }>;
  description?: string;
  startDate?: string;
  estimatedDuration?: number;
}
```

### Interface: Note
```typescript
interface Note {
  id: string;
  date: string;
  title: string;
  preview: string;
  content?: string;
  tags?: string[];
  lastEdited?: string;
  filePath?: string;
  lastSynced?: string;
}
```

### Interface: PlanningItem
```typescript
interface PlanningItem {
  id: string;
  title: string;
  tag: string;
  stage: string;
  active: boolean;
}
```

### Interface: Activity
```typescript
interface Activity {
  id: string;
  text: string;
  time: string;
  type: 'entry' | 'sync' | 'ai' | 'system';
}
```

### Interface: Novel
```typescript
interface Novel {
  id: string;
  title: string;
  icon: string;
  status: 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED';
  wordCount: number;
  targetWordCount: number;
  progress: number;
  chapters: number;
  notesCount: number;
  createdDate: string;
  lastUpdated: string;
  genre: string[];
  isRecentlyUpdated: boolean;
  coverImage?: string;
}
```

### Interface: Project
```typescript
interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFTING' | 'PLANNING' | 'COMPLETE' | 'REVIEW';
  words: string;
  updated: string;
  icon: string;
  dueDate?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  progress?: number;
  team?: string[];
  tags?: string[];
  type?: 'SINGLE' | 'MULTI';
  linkedResources?: {
        novels?: string[]; // IDs of linked novels
        journals?: string[]; // IDs of linked journals/notes
        snippets?: string[]; // IDs of linked code snippets
        meetings?: string[]; // IDs of linked meetings
        research?: string[]; // IDs of linked research sources/libraries
        books?: string[]; // IDs of linked books
        articles?: string[]; // IDs of linked articles
    };
}
```

### Interface: BinItem
```typescript
interface BinItem {
  id: string;
  type: BinItemType;
  originalId: string;
  contextId?: string;
  title?: string;
  deletedAt: string;
  payload: unknown;
}
```

### Type: BinItemType
```typescript
type BinItemType = | 'daily-note'
    | 'novel'
    | 'novel-chapter'
    | 'novel-group'
    | 'novel-note'
    | 'novel-character'
    | 'novel-location'
    | 'journal-entry'
    | 'journal-project'
    | 'task'
    | 'meeting'
    | 'book'
    | 'snippet';
```

---

## File: /libs/state/src/lib/bin.service.ts

### Class: BinService
```typescript
class BinService {
  items: any;
  addToBin(item: Omit<BinItem, 'id' | 'deletedAt'>): any;
  permanentlyDelete(binItemId: string): any;
  emptyBin(): any;
}
```

---

## File: /libs/state/src/lib/store.service.ts

### Class: StoreService
```typescript
class StoreService {
  tasks: any;
  notes: any;
  planningItems: any;
  activities: any;
  novels: any;
  projects: any;
  loadNoteContent(id: string): Promise<string>;
  addTask(task: Task): any;
  updateTask(id: string, updates: Partial<Task>): any;
  deleteTask(id: string): any;
  addNote(note: Note): any;
  updateNote(id: string, updates: Partial<Note>): any;
  deleteNote(id: string): any;
  addPlanningItem(item: PlanningItem): any;
  addNovel(novel: Novel): any;
  addProject(project: Project): any;
  updateProject(id: string, updates: Partial<Project>): any;
  deleteNovel(id: string): any;
  addActivity(text: string, type: Activity['type']): any;
}
```

---

## File: /libs/core/src/lib/core/core.ts

### Class: Core
```typescript
class Core {
}
```

---

## File: /libs/core/src/lib/services/ai.service.ts

### Class: AiService
```typescript
class AiService {
  aiEnabled: any;
  provider: any;
  modelName: any;
  apiKey: any;
  updateConfig(provider: AiProvider, model: string, key: string): any;
  toggleAi(): any;
  sendMessage(prompt: string, context: string): Promise<string>;
  analyzeToneAndPacing(content: string): Promise<string>;
  generateSuggestions(content: string): Promise<AiSuggestion[]>;
  summarizeContent(content: string): Promise<string>;
  continueWriting(content: string, cursorPosition: number): Promise<string>;
  improveText(selectedText: string, context: string): Promise<string>;
  expandIdea(idea: string, context: string): Promise<string>;
  estimateTokens(text: string): number;
}
```

### Interface: AiMessage
```typescript
interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: string;
}
```

### Interface: AiSuggestion
```typescript
interface AiSuggestion {
  id: string;
  type: 'improvement' | 'continuation' | 'analysis' | 'summary';
  content: string;
  originalText?: string;
  position?: number;
}
```

### Type: AiProvider
```typescript
type AiProvider = 'openai' | 'anthropic' | 'ollama' | 'mock';
```

---

## File: /libs/core/src/lib/services/api.service.ts

### Class: ApiService
```typescript
class ApiService {
  get(path: string, params: Record<string, string | number | boolean>): Observable<T>;
  post(path: string, body: unknown): Observable<T>;
  put(path: string, body: unknown): Observable<T>;
  patch(path: string, body: unknown): Observable<T>;
  delete(path: string): Observable<T>;
}
```

---

## File: /libs/core/src/lib/services/article.service.ts

### Class: ArticleService
```typescript
class ArticleService {
  articles: any;
  loadArticleContent(id: string): Promise<string>;
  getArticles(): any;
  getArticle(id: string): Article | undefined;
  addArticle(article: Omit<Article, 'id' | 'createdDate' | 'lastUpdated'>): Article;
  updateArticle(id: string, updates: Partial<Article>): void;
  deleteArticle(id: string): void;
  getArticlesByPlatform(platform: string): Article[];
  getArticlesByPipeline(pipeline: string): Article[];
  searchArticles(query: string): Article[];
}
```

### Interface: Article
```typescript
interface Article {
  id: string;
  title: string;
  platform: 'Medium' | 'Substack' | 'Blog' | 'Dev.to' | 'Hashnode' | 'Custom';
  pipeline: 'PUBLISHED' | 'DRAFT' | 'REVIEW' | 'SCHEDULED';
  wordCount: number;
  content?: string;
  url?: string;
  scheduledDate?: string;
  engagement?: {
    views: string;
    comments: string;
    likes?: string;
  };
  tags: string[];
  lastUpdated: string;
  createdDate: string;
  icon: string;
  excerpt?: string;
  filePath?: string;
  lastSynced?: string;
}
```

---

## File: /libs/core/src/lib/services/auth.service.ts

### Class: AuthService
```typescript
class AuthService {
  isAuthenticated: any;
  currentUser: any;
  initialized: any;
  isGuest: any;
  getToken(): string | null;
  loginAsGuest(): any;
  login(email: string, password: string): Promise<boolean>;
  signUp(email: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  refreshToken(): Promise<boolean>;
}
```

---

## File: /libs/core/src/lib/services/books.service.ts

### Class: BooksService
```typescript
class BooksService {
  books: any;
  selectedBookId: any;
  viewFilter: any;
  viewMode: any;
  sortBy: any;
  sortDirection: any;
  searchQuery: any;
  selectedCategory: any;
  selectedBook: any;
  availableCategories: any;
  filteredBooks: any;
  stats: any;
  booksByCategory: any;
  addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Book;
  updateBook(id: string, patch: Partial<Book>): void;
  deleteBook(id: string): void;
  setProgress(id: string, progress: number): void;
  setStatus(id: string, status: BookStatus): void;
  addNote(bookId: string, content: string, page: number): void;
  deleteNote(bookId: string, noteId: string): void;
  touchLastAccessed(id: string): void;
}
```

### Interface: BookNote
```typescript
interface BookNote {
  id: string;
  content: string;
  page?: number;
  createdAt: string;
}
```

### Interface: Book
```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  status: BookStatus;
  progress: number;
  notesCount: number;
  lastAccessed: string;
  coverImage?: string;
  isbn?: string;
  year?: number;
  notes?: BookNote[];
  createdAt: string;
  updatedAt: string;
}
```

### Type: BookCategory
```typescript
type BookCategory = 'DESIGN' | 'CREATIVE' | 'PRODUCTIVITY' | 'OTHER';
```

### Type: BookStatus
```typescript
type BookStatus = 'reading' | 'completed' | 'queued';
```

### Type: BookViewFilter
```typescript
type BookViewFilter = 'all' | 'reading' | 'completed' | 'queued';
```

### Type: BookViewMode
```typescript
type BookViewMode = 'list' | 'grid';
```

### Type: BookSortBy
```typescript
type BookSortBy = 'title' | 'author' | 'lastAccessed' | 'progress' | 'category';
```

---

## File: /libs/core/src/lib/services/file-system.service.ts

### Class: FileSystemService
```typescript
class FileSystemService {
  init(): any;
  saveFile(category: string, id: string, content: string, extension: string): Promise<string>;
  readFile(category: string, id: string, extension: string): Promise<string | null>;
  deleteFile(category: string, id: string, extension: string): Promise<void>;
  saveNote(id: string, content: string): Promise<string>;
  readNote(id: string): Promise<string | null>;
  deleteNote(id: string): Promise<void>;
}
```

---

## File: /libs/core/src/lib/services/journal.service.ts

### Class: JournalService
```typescript
class JournalService {
  projects: any;
  entries: any;
  columns: any;
  loadEntryContent(id: string): Promise<string>;
  getProjects(): JournalProject[];
  getProject(id: string): JournalProject | undefined;
  getActiveProject(): JournalProject | undefined;
  setActiveProject(id: string): any;
  addProject(project: Omit<JournalProject, 'id' | 'entriesCount' | 'wordCount' | 'createdDate' | 'lastUpdated' | 'columns'>): any;
  updateProject(id: string, updates: Partial<JournalProject>): any;
  deleteProject(id: string): any;
  getEntries(projectId: string): JournalEntry[];
  getEntriesByColumn(projectId: string, columnId: string): JournalEntry[];
  getEntry(id: string): JournalEntry | undefined;
  addEntry(entry: Omit<JournalEntry, 'id' | 'createdDate' | 'lastEdited' | 'wordCount' | 'characterCount'>): any;
  updateEntry(id: string, updates: Partial<JournalEntry>): any;
  deleteEntry(id: string): any;
  moveEntry(entryId: string, newColumn: string): any;
  getColumns(projectId: string): JournalColumn[];
  addColumn(column: Omit<JournalColumn, 'id'>): any;
  updateColumn(id: string, updates: Partial<JournalColumn>): any;
  deleteColumn(id: string): any;
  searchEntries(query: string, projectId: string): JournalEntry[];
  getAllTags(projectId: string): string[];
  getEntriesByTag(tag: string, projectId: string): JournalEntry[];
  getProjectStats(projectId: string): any;
}
```

### Interface: JournalEntry
```typescript
interface JournalEntry {
  id: string;
  projectId: string;
  title: string;
  content: string;
  preview: string;
  type: 'CONCEPT' | 'CHAPTER' | 'SETTING' | 'CRITICAL' | 'NOTE' | 'IDEA';
  column: string;
  tags?: string[];
  wordCount: number;
  characterCount: number;
  createdDate: string;
  lastEdited: string;
  hasAi?: boolean;
  isAiEdited?: boolean;
  progress?: number;
  statusColor?: string;
  meta?: string;
  isLocked?: boolean;
  linkedEntries?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  filePath?: string;
  lastSynced?: string;
}
```

### Interface: JournalProject
```typescript
interface JournalProject {
  id: string;
  title: string;
  description?: string;
  entriesCount: number;
  active: boolean;
  wordCount: number;
  targetWordCount?: number;
  progress?: number;
  createdDate: string;
  lastUpdated: string;
  columns: string[];
  tags?: string[];
  isLocked?: boolean;
}
```

### Interface: JournalColumn
```typescript
interface JournalColumn {
  id: string;
  name: string;
  color: string;
  order: number;
}
```

---

## File: /libs/core/src/lib/services/logging.service.ts

### Class: LoggingService
```typescript
class LoggingService {
  setCorrelationId(id: string | null): void;
  debug(message: string, args: unknown[]): void;
  info(message: string, args: unknown[]): void;
  warn(message: string, args: unknown[]): void;
  error(message: string, error: unknown, args: unknown[]): void;
}
```

### Type: LogLevel
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

---

## File: /libs/core/src/lib/services/meetings.service.ts

### Class: MeetingsService
```typescript
class MeetingsService {
  meetings: any;
  selectedMeetingId: any;
  viewFilter: any;
  viewMode: any;
  sortBy: any;
  sortDirection: any;
  searchQuery: any;
  selectedProject: any;
  selectedLabels: any;
  calendarDate: any;
  selectedMeeting: any;
  availableProjects: any;
  availableLabels: any;
  filteredMeetings: any;
  meetingsByStatus: any;
  meetingStats: any;
  upcomingSyncs: any;
  getMeetingsForDate(date: Date): Meeting[];
  addMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): any;
  updateMeeting(id: string, updates: Partial<Meeting>): any;
  deleteMeeting(id: string): any;
  cancelMeeting(id: string): any;
  completeMeeting(id: string): any;
  rescheduleMeeting(id: string, newDate: string, newStartTime: string, newEndTime: string): any;
  duplicateMeeting(id: string, newDate: string): Meeting | null;
  addAgendaItem(meetingId: string, item: Omit<AgendaItem, 'id'>): any;
  updateAgendaItem(meetingId: string, itemId: string, updates: Partial<AgendaItem>): any;
  deleteAgendaItem(meetingId: string, itemId: string): any;
  addActionItem(meetingId: string, item: Omit<ActionItem, 'id'>): any;
  updateActionItem(meetingId: string, itemId: string, updates: Partial<ActionItem>): any;
  deleteActionItem(meetingId: string, itemId: string): any;
  convertActionItemToTask(meetingId: string, actionItemId: string): void;
  addNote(meetingId: string, content: string, createdBy: string): any;
  updateNote(meetingId: string, noteId: string, content: string): any;
  deleteNote(meetingId: string, noteId: string): any;
  addAttendee(meetingId: string, attendee: Omit<Attendee, 'id'>): any;
  updateAttendee(meetingId: string, attendeeId: string, updates: Partial<Attendee>): any;
  removeAttendee(meetingId: string, attendeeId: string): any;
  createRecurringSeries(baseMeeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>, count: number): Meeting[];
  formatMeetingTime(meeting: Meeting): string;
  formatTime(time: string): string;
  getMeetingDurationDisplay(meeting: Meeting): string;
  isMeetingToday(meeting: Meeting): boolean;
  isMeetingTomorrow(meeting: Meeting): boolean;
  getRelativeDateLabel(meeting: Meeting): string;
  getOpenActionItemsCount(meeting: Meeting): number;
  getTotalActionItemsCount(meeting: Meeting): number;
}
```

### Interface: Attendee
```typescript
interface Attendee {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: 'organizer' | 'required' | 'optional';
  status?: 'accepted' | 'declined' | 'tentative' | 'pending';
}
```

### Interface: AgendaItem
```typescript
interface AgendaItem {
  id: string;
  title: string;
  duration?: number;
  presenter?: string;
  completed?: boolean;
  notes?: string;
}
```

### Interface: MeetingNote
```typescript
interface MeetingNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: string;
}
```

### Interface: ActionItem
```typescript
interface ActionItem {
  id: string;
  title: string;
  assignee?: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'completed';
  linkedTaskId?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

### Interface: Meeting
```typescript
interface Meeting {
  id: string;
  title: string;
  description?: string;
  project?: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  timezone?: string;
  location?: string;
  meetingLink?: string;
  meetingType: 'video' | 'phone' | 'in-person' | 'hybrid';
  platform?: 'zoom' | 'teams' | 'meet' | 'discord' | 'other';
  attendees: Attendee[];
  organizer?: Attendee;
  agenda?: AgendaItem[];
  notes?: MeetingNote[];
  actionItems?: ActionItem[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  color: string;
  labels?: string[];
  recurring?: {
    pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
    interval?: number;
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
    endDate?: string;
    seriesId?: string;
    occurrenceNumber?: number;
  };
  reminders?: Array<{
    time: number; // minutes before meeting
    type: 'notification' | 'email';
    sent?: boolean;
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
```

### Type: MeetingViewFilter
```typescript
type MeetingViewFilter = 'all' | 'today' | 'upcoming' | 'past' | 'cancelled';
```

### Type: MeetingViewMode
```typescript
type MeetingViewMode = 'list' | 'calendar' | 'kanban';
```

### Type: MeetingSortBy
```typescript
type MeetingSortBy = 'date' | 'title' | 'project' | 'priority' | 'attendees';
```

---

## File: /libs/core/src/lib/services/notification.service.ts

### Class: NotificationService
```typescript
class NotificationService {
  allNotifications: any;
  unreadCount: any;
  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string;
  info(title: string, message: string, options: Partial<Notification>): any;
  success(title: string, message: string, options: Partial<Notification>): any;
  warning(title: string, message: string, options: Partial<Notification>): any;
  error(title: string, message: string, options: Partial<Notification>): any;
  markAsRead(id: string): any;
  markAllAsRead(): any;
  delete(id: string): any;
  clearAll(): any;
  clearRead(): any;
  getById(id: string): Notification | undefined;
  getUnread(): Notification[];
}
```

### Interface: Notification
```typescript
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionCallback?: () => void;
  icon?: string;
}
```

### Type: NotificationType
```typescript
type NotificationType = 'info' | 'success' | 'warning' | 'error';
```

---

## File: /libs/core/src/lib/services/novel-content.service.ts

### Class: NovelContentService
```typescript
class NovelContentService {
  activeNovel: any;
  store: any;
  loadNovel(id: string): Promise<void>;
  getChapter(chapterId: string): Chapter | undefined;
  updateChapterContent(chapterId: string, content: string, wordCount: number): any;
  toggleGroupExpand(groupId: string): any;
  updateChapterTitle(chapterId: string, title: string): any;
  updateChapterTags(chapterId: string, tags: string[]): any;
  updateChapterSummary(chapterId: string, summary: string): any;
  addChapter(groupId: string, title: string): any;
  deleteChapter(chapterId: string): any;
  addChapterGroup(title: string): any;
  reorderChapterGroup(fromIndex: number, toIndex: number): any;
  reorderChapter(groupId: string, fromIndex: number, toIndex: number): any;
  deleteChapterGroup(groupId: string): any;
  addNote(title: string, body: string, chapterId: string): any;
  updateNote(noteId: string, title: string, body: string): any;
  deleteNote(noteId: string): any;
  addCharacter(name: string, role: string, archetype: string, description: string): any;
  updateCharacter(characterId: string, updates: Partial<Character>): any;
  deleteCharacter(characterId: string): any;
  addLocation(name: string, type: string, description: string): any;
  updateLocation(locationId: string, updates: Partial<Location>): any;
  deleteLocation(locationId: string): any;
  updateNovelTitle(title: string): any;
  updateSynopsis(logline: string, theme: string): any;
  addFrontMatterItem(type: FrontMatterItem['type'], title: string): any;
  updateFrontMatterContent(itemId: string, content: string, wordCount: number): any;
  updateFrontMatterTitle(itemId: string, title: string): any;
  deleteFrontMatterItem(itemId: string): any;
  addPrologue(title: string): any;
  updatePrologueContent(content: string, wordCount: number): any;
  updatePrologueTitle(title: string): any;
  deletePrologue(): any;
  updateChapterPlotPoint(chapterId: string, plotPoint: 'firstSlap' | 'secondSlap' | 'climax', content: string): any;
  createAndPersistEmptyNovel(id: string, title: string): Promise<void>;
}
```

### Interface: NovelContent
```typescript
interface NovelContent {
  id: string;
  title: string;
  synopsis: {
        logline: string;
        theme: string;
    };
  frontMatter: FrontMatterItem[];
  prologue?: Prologue;
  chapters: ChapterGroup[];
  characters: Character[];
  locations: Location[];
  notes: EditorNote[];
}
```

### Interface: ChapterGroup
```typescript
interface ChapterGroup {
  id: string;
  title: string;
  expanded: boolean;
  children: Chapter[];
}
```

### Interface: Chapter
```typescript
interface Chapter {
  id: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY';
  wordCount: number;
  lastEdited: string;
  summary?: string;
  tags?: string[];
  template?: string;
  plotPoints?: {
        firstSlap?: string; // Inciting incident
        secondSlap?: string; // Midpoint
        climax?: string; // Resolution
    };
}
```

### Interface: FrontMatterItem
```typescript
interface FrontMatterItem {
  id: string;
  type: 'title-page' | 'copyright' | 'toc' | 'dedication' | 'foreword' | 'preface';
  title: string;
  content: string;
  wordCount: number;
  lastEdited: string;
}
```

### Interface: Prologue
```typescript
interface Prologue {
  id: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY';
  wordCount: number;
  lastEdited: string;
}
```

### Interface: Character
```typescript
interface Character {
  id: string;
  name: string;
  role: string;
  archetype: string;
  description: string;
}
```

### Interface: Location
```typescript
interface Location {
  id: string;
  name: string;
  type: string;
  description: string;
}
```

### Interface: EditorNote
```typescript
interface EditorNote {
  id: string;
  title: string;
  body: string;
  date: string;
  chapterId?: string;
}
```

---

## File: /libs/core/src/lib/services/research.service.ts

### Class: ResearchService
```typescript
class ResearchService {
  libraries: any;
  sources: any;
  summaries: any;
  addLibrary(library: Omit<ResearchLibrary, 'id' | 'createdDate' | 'lastModified'>): any;
  updateLibrary(id: string, updates: Partial<ResearchLibrary>): any;
  deleteLibrary(id: string): any;
  addSource(source: Omit<ResearchSource, 'id' | 'createdDate'>): any;
  updateSource(id: string, updates: Partial<ResearchSource>): any;
  deleteSource(id: string): any;
  getSourcesByLibrary(libraryId: string): any;
  addSummary(summary: Omit<ResearchSummary, 'id' | 'createdDate' | 'lastModified'>): any;
  updateSummary(id: string, updates: Partial<ResearchSummary>): any;
  deleteSummary(id: string): any;
  getSummariesByLibrary(libraryId: string): any;
}
```

### Interface: ResearchLibrary
```typescript
interface ResearchLibrary {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdDate: string;
  lastModified: string;
}
```

### Interface: ResearchSource
```typescript
interface ResearchSource {
  id: string;
  libraryId: string;
  title: string;
  sourceType: 'WEB' | 'PDF' | 'INTERVIEW' | 'PHYSICAL' | 'VIDEO' | 'ARTICLE';
  url?: string;
  description?: string;
  author?: string;
  publishDate?: string;
  tags: string[];
  status: 'UNREAD' | 'READING' | 'PROCESSED';
  notes?: string;
  createdDate: string;
  lastAccessed?: string;
}
```

### Interface: ResearchSummary
```typescript
interface ResearchSummary {
  id: string;
  libraryId: string;
  title: string;
  content: string;
  sourceIds: string[];
  tags: string[];
  createdDate: string;
  lastModified: string;
}
```

---

## File: /libs/core/src/lib/services/session.service.ts

### Class: SessionService
```typescript
class SessionService {
  pageStats: any;
  todayTime: any;
  totalSessionTime: any;
  currentPageName: any;
  ngOnDestroy(): void;
  getTimeSpentOnPage(page: string): number;
  getVisitsForPage(page: string): number;
  formatTime(ms: number): string;
  formatTimeShort(ms: number): string;
  resetSessionData(): void;
}
```

### Interface: PageSession
```typescript
interface PageSession {
  page: string;
  totalTimeMs: number;
  visits: number;
  lastVisited: string;
}
```

### Interface: SessionData
```typescript
interface SessionData {
  pages: Record<string, PageSession>;
  sessionStart: string;
  totalSessionTimeMs: number;
  todayTimeMs: number;
  todayDate: string;
}
```

---

## File: /libs/core/src/lib/services/snippets.service.ts

### Class: SnippetsService
```typescript
class SnippetsService {
  snippets: any;
  selectedSnippetId: any;
  viewFilter: any;
  viewMode: any;
  sortBy: any;
  sortDirection: any;
  searchQuery: any;
  selectedLang: any;
  selectedTag: any;
  LANGS: any;
  selectedSnippet: any;
  allTags: any;
  filteredSnippets: any;
  stats: any;
  snippetsByLang: any;
  addSnippet(snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>): Snippet;
  updateSnippet(id: string, patch: Partial<Snippet>): void;
  deleteSnippet(id: string): void;
  copyContent(id: string): string | null;
}
```

### Interface: Snippet
```typescript
interface Snippet {
  id: string;
  title: string;
  lang: SnippetLang;
  tags: string[];
  content: string;
  filename: string;
  path: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}
```

### Type: SnippetLang
```typescript
type SnippetLang = | 'Python'
  | 'JavaScript'
  | 'TypeScript'
  | 'Markdown'
  | 'SQL'
  | 'HTML'
  | 'CSS'
  | 'JSON'
  | 'Shell'
  | 'Other';
```

### Type: SnippetViewFilter
```typescript
type SnippetViewFilter = 'all' | SnippetLang;
```

### Type: SnippetViewMode
```typescript
type SnippetViewMode = 'list' | 'grid';
```

### Type: SnippetSortBy
```typescript
type SnippetSortBy = 'title' | 'lastModified' | 'lang' | 'path';
```

---

## File: /libs/core/src/lib/services/sqlite-data.service.ts

### Class: SqliteDataService
```typescript
class SqliteDataService {
  getAll(collection: string): Promise<T[]>;
  upsert(collection: string, item: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  importData(data: any): Promise<void>;
}
```

---

## File: /libs/core/src/lib/services/sqlite.service.ts

### Class: SqliteService
```typescript
class SqliteService {
  getDb(): Promise<Database>;
  getAllTasks(): Promise<TaskDoc[]>;
  upsertTask(task: TaskDoc): Promise<void>;
  removeTask(id: string): Promise<void>;
  tasks$(): Observable<TaskDoc[]>;
  getAllNotes(): Promise<NoteDoc[]>;
  upsertNote(note: NoteDoc): Promise<void>;
  removeNote(id: string): Promise<void>;
  notes$(): Observable<NoteDoc[]>;
  upsertPlanningItem(item: PlanningItemDoc): Promise<void>;
  planningItems$(): Observable<PlanningItemDoc[]>;
  getAllPlanningItems(): Promise<PlanningItemDoc[]>;
  upsertActivity(act: ActivityDoc): Promise<void>;
  activities$(): Observable<ActivityDoc[]>;
  getAllActivities(): Promise<ActivityDoc[]>;
  removeActivity(id: string): Promise<void>;
  upsertNovel(novel: NovelDoc): Promise<void>;
  novels$(): Observable<NovelDoc[]>;
  getAllNovels(): Promise<NovelDoc[]>;
  removeNovel(id: string): Promise<void>;
  getNovelContent(id: string): Promise<string | null>;
  setNovelContent(id: string, data: string): Promise<void>;
  removeNovelContent(id: string): Promise<void>;
  upsertBinItem(item: BinItemDoc): Promise<void>;
  removeBinItem(id: string): Promise<void>;
  clearBin(): Promise<void>;
  binItems$(): Observable<BinItemDoc[]>;
  getAllBinItems(): Promise<BinItemDoc[]>;
  upsertSnippet(doc: SnippetDoc): Promise<void>;
  removeSnippet(id: string): Promise<void>;
  getAllSnippets(): Promise<SnippetDoc[]>;
  upsertBook(doc: BookDoc): Promise<void>;
  removeBook(id: string): Promise<void>;
  getAllBooks(): Promise<BookDoc[]>;
  upsertMeeting(doc: MeetingDoc): Promise<void>;
  getAllMeetings(): Promise<MeetingDoc[]>;
  removeMeeting(id: string): Promise<void>;
  getAllArticles(): Promise<ArticleDoc[]>;
  upsertArticle(article: ArticleDoc): Promise<void>;
  removeArticle(id: string): Promise<void>;
  upsertJournalProject(doc: JournalProjectDoc): Promise<void>;
  removeJournalProject(id: string): Promise<void>;
  getAllJournalProjects(): Promise<JournalProjectDoc[]>;
  upsertJournalEntry(entry: JournalEntryDoc): Promise<void>;
  removeJournalEntry(id: string): Promise<void>;
  getAllJournalEntries(): Promise<JournalEntryDoc[]>;
  upsertJournalColumn(doc: JournalColumnDoc): Promise<void>;
  removeJournalColumn(id: string): Promise<void>;
  getAllJournalColumns(): Promise<JournalColumnDoc[]>;
  upsertResearchLibrary(doc: ResearchLibraryDoc): Promise<void>;
  getAllResearchLibraries(): Promise<ResearchLibraryDoc[]>;
  removeResearchLibrary(id: string): Promise<void>;
  upsertResearchSource(doc: ResearchSourceDoc): Promise<void>;
  getAllResearchSources(): Promise<ResearchSourceDoc[]>;
  removeResearchSource(id: string): Promise<void>;
  upsertResearchSummary(doc: ResearchSummaryDoc): Promise<void>;
  getAllResearchSummaries(): Promise<ResearchSummaryDoc[]>;
  removeResearchSummary(id: string): Promise<void>;
  exportAllData(): Promise<any>;
}
```

### Interface: NovelContentDoc
```typescript
interface NovelContentDoc {
  id: string;
  data: string;
}
```

### Type: TaskDoc
```typescript
type TaskDoc = Task;
```

### Type: NoteDoc
```typescript
type NoteDoc = Note;
```

### Type: PlanningItemDoc
```typescript
type PlanningItemDoc = PlanningItem;
```

### Type: ActivityDoc
```typescript
type ActivityDoc = Activity;
```

### Type: NovelDoc
```typescript
type NovelDoc = Novel;
```

### Type: BinItemDoc
```typescript
type BinItemDoc = BinItem;
```

### Type: SnippetDoc
```typescript
type SnippetDoc = Snippet;
```

### Type: BookDoc
```typescript
type BookDoc = Book;
```

### Type: MeetingDoc
```typescript
type MeetingDoc = Meeting;
```

### Type: ArticleDoc
```typescript
type ArticleDoc = Article;
```

### Type: JournalProjectDoc
```typescript
type JournalProjectDoc = JournalProject;
```

### Type: JournalEntryDoc
```typescript
type JournalEntryDoc = JournalEntry;
```

### Type: JournalColumnDoc
```typescript
type JournalColumnDoc = JournalColumn;
```

### Type: ResearchLibraryDoc
```typescript
type ResearchLibraryDoc = ResearchLibrary;
```

### Type: ResearchSourceDoc
```typescript
type ResearchSourceDoc = ResearchSource;
```

### Type: ResearchSummaryDoc
```typescript
type ResearchSummaryDoc = ResearchSummary;
```

---

## File: /libs/core/src/lib/services/supabase.service.ts

### Class: SupabaseService
```typescript
class SupabaseService {
  getSession(): Promise<{ data: { session: Session | null }; error: any }>;
  getUser(): Promise<{ data: { user: User | null }; error: any }>;
  profile(user: User): any;
  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void): any;
  signIn(email: string): any;
  signOut(): any;
}
```

---

## File: /libs/core/src/lib/services/tauri.service.ts

### Class: TauriService
```typescript
class TauriService {
  isTauri: any;
  getName(): Promise<string>;
  getVersion(): Promise<string>;
  setTitle(title: string): Promise<void>;
  openUrl(url: string): Promise<void>;
  saveFile(options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }): Promise<string | null>;
  openFile(options: { multiple?: boolean; filters?: { name: string; extensions: string[] }[] }): Promise<string | string[] | null>;
  writeTextFile(path: string, contents: string): Promise<void>;
  readTextFile(path: string): Promise<string>;
  onFileDrop(callback: (paths: string[]) => void): Promise<() => void>;
  notify(options: { title: string; body?: string }): Promise<void>;
}
```

---

## File: /libs/core/src/lib/services/theme.service.ts

### Class: ThemeService
```typescript
class ThemeService {
  theme: any;
  setTheme(newTheme: Theme): any;
  toggleTheme(): any;
}
```

### Type: Theme
```typescript
type Theme = 'dark' | 'enterprise-dark' | 'light' | 'colorful' | 'enterprise-light' | 'typewriter';
```

---

## File: /libs/core/src/lib/services/user.service.ts

### Class: UserService
```typescript
class UserService {
  user: any;
  isLoggedIn: any;
  userName: any;
  userInitials: any;
  getAvatarForGender(gender: 'male' | 'female'): string;
  updateProfile(updates: Partial<UserProfile>): any;
  updatePreferences(preferences: Partial<UserProfile['preferences']>): any;
  updateStats(stats: Partial<UserProfile['stats']>): any;
  addWords(count: number): any;
  addDocument(): any;
  logout(): any;
}
```

### Interface: UserProfile
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: string;
  joinedDate: Date;
  preferences: {
    emailNotifications: boolean;
    weeklyDigest: boolean;
    autoBackup: boolean;
    autoSchedule: boolean;
    gender?: 'male' | 'female';
  };
  stats: {
    totalWords: number;
    totalDocuments: number;
    totalProjects: number;
    daysActive: number;
    currentStreak: number;
    lastLoginDate: string;
  };
}
```

---

## File: /libs/core/src/lib/services/version-history.service.ts

### Class: VersionHistoryService
```typescript
class VersionHistoryService {
  createSnapshot(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue', content: string, title: string, wordCount: number, description: string): VersionSnapshot;
  addVersion(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue', content: string, title: string, wordCount: number, immediate: boolean): void;
  getHistory(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionHistory;
  getVersions(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot[];
  getCurrentVersion(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot | null;
  canUndo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): boolean;
  canRedo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): boolean;
  undo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot | null;
  redo(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): VersionSnapshot | null;
  restoreVersion(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue', versionId: string): VersionSnapshot | null;
  clearHistory(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): void;
  formatTimestamp(date: Date): string;
}
```

### Interface: VersionSnapshot
```typescript
interface VersionSnapshot {
  id: string;
  timestamp: Date;
  contentId: string;
  contentType: 'chapter' | 'frontMatter' | 'prologue';
  content: string;
  title?: string;
  wordCount: number;
  description?: string;
}
```

### Interface: VersionHistory
```typescript
interface VersionHistory {
  contentId: string;
  contentType: 'chapter' | 'frontMatter' | 'prologue';
  versions: VersionSnapshot[];
  currentIndex: number;
}
```

---

## File: /libs/core/src/lib/utils/tauri-helpers.ts

### Function: isTauriEnvironment
```typescript
function isTauriEnvironment(): boolean
```

### Function: logIfTauri
```typescript
function logIfTauri(message: string, error: any): void
```

### Function: createTauriErrorHandler
```typescript
function createTauriErrorHandler(message: string): (error: any) => void
```

---

## File: /libs/feature-novels/src/lib/novels/novels.component.ts

### Class: NovelsComponent
```typescript
class NovelsComponent {
  store: any;
  viewMode: any;
  statusFilter: any;
  sortBy: any;
  statusDropdownOpen: any;
  sortDropdownOpen: any;
  showAddModal: any;
  addModalSubmitting: any;
  newNovel: any;
  novelIcons: any;
  novelMenuOpen: any;
  showDeleteModal: any;
  novelToDelete: any;
  novels: any;
  totalWords: any;
  activeDrafts: any;
  avgCompletion: any;
  toggleView(mode: 'LIST' | 'GRID'): any;
  toggleStatusDropdown(): any;
  toggleSortDropdown(): any;
  selectStatus(status: 'ALL' | 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED'): any;
  selectSort(sort: 'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS'): any;
  getStatusIcon(status: string): string;
  getStatusLabel(status: string): string;
  getSortIcon(sort: string): string;
  getSortLabel(sort: string): string;
  getStatusColor(status: string): any;
  getProgressColor(status: string): any;
  openNovel(id: string): any;
  toggleNovelMenu(novelId: string, e: Event): any;
  closeNovelMenu(): any;
  openDeleteModal(novel: Novel, e: Event): any;
  cancelDeleteNovel(): any;
  confirmDeleteNovel(): any;
  openAddModal(): any;
  closeAddModal(): any;
  updateNewNovel(key: 'title' | 'status' | 'genre' | 'targetWordCount' | 'icon', value: string | number): any;
  addNovel(): any;
  onDocumentClick(event: MouseEvent): any;
  onKeyDown(e: KeyboardEvent): any;
}
```

---

## File: /libs/feature-tasks/src/lib/tasks/tasks.component.ts

### Class: TasksComponent
```typescript
class TasksComponent {
  store: any;
  sidebarSearch: any;
  selectedView: any;
  quickAddMode: any;
  viewMode: any;
  quickAddVisible: any;
  quickAddInput: any;
  focusMode: any;
  focusedTask: any;
  showTaskDetails: any;
  selectedTaskForDetails: any;
  editingTaskDetails: any;
  editedTaskTitle: any;
  editedTaskDescription: any;
  editedTaskPriority: any;
  editedTaskDue: any;
  editedTaskList: any;
  editedTaskLabels: any;
  pomodoroActive: any;
  pomodoroTime: any;
  pomodoroTask: any;
  showShortcutsHelp: any;
  timelineViewDate: any;
  timelineZoom: any;
  selectedTasks: any;
  bulkActionMode: any;
  actionHistory: any;
  historyIndex: any;
  theme: any;
  uploadingFiles: any;
  filesToUpload: any;
  showMarkdownPreview: any;
  isLoading: any;
  virtualScrollEnabled: any;
  visibleTaskRange: any;
  itemHeight: number;
  isListening: any;
  voiceRecognition: any;
  voiceTranscript: any;
  showCameraCapture: any;
  capturedPhoto: any;
  showAttachmentsMenu: any;
  errorMessage: any;
  showError: any;
  previewingImage: any;
  snoozeOptions: any;
  fontSize: any;
  customColors: any;
  showThemeSettings: any;
  showSnoozeOptions: any;
  newTaskModalOpen: any;
  newTaskTitle: any;
  newTaskDescription: any;
  newTaskPriority: any;
  newTaskDue: any;
  newTaskDueTime: any;
  newTaskList: any;
  newTaskHasReminder: any;
  newTaskReminderTimes: any;
  newReminderTimeInput: any;
  newTaskLabels: any;
  newTaskLabelInput: any;
  showLabelAutocomplete: any;
  newTaskRecurring: any;
  newTaskRecurringPattern: any;
  newTaskSubtasks: any;
  newSubtaskInput: any;
  showAdvancedOptions: any;
  newTaskDependencies: any;
  showDatePicker: any;
  datePickerDate: any;
  showFolderDropdown: any;
  showCreateFolder: any;
  newFolderName: any;
  showCreateFolderInSidebar: any;
  newFolderNameSidebar: any;
  selectedFolder: any;
  sidebarActiveId: any;
  availableLists: any;
  deleteModalOpen: any;
  taskPendingDelete: any;
  sidebarItems: any;
  filtersActive: any;
  viewTitle: any;
  viewSubtitle: any;
  selectedFilter: any;
  metricFilter: any;
  currentDate: any;
  todayGroupExpanded: any;
  upcomingGroupExpanded: any;
  noDueDateGroupExpanded: any;
  todayTasksCount: any;
  completedTasksCount: any;
  activeTasksCount: any;
  priorityTasksCount: any;
  inboxTasks: any;
  viewTasks: any;
  filteredTasks: any;
  allVisibleTasksCompleted: any;
  calendarMonth: any;
  calendarDays: any;
  todayTasks: any;
  upcomingTasks: any;
  noDueDateTasks: any;
  activeTasksCountSidebar: any;
  datePickerPosition: any;
  folderDropdownPosition: any;
  kanbanDraggedTask: any;
  calendarViewDate: any;
  pomodoroInterval: any;
  allLabels: any;
  canUndo: any;
  canRedo: any;
  visibleTasks: any;
  getFolderTaskCount(folderName: string): number;
  selectFolderInSidebar(folderName: string): any;
  createFolderInSidebar(): any;
  openNewTaskDialog(): any;
  closeNewTaskDialog(): any;
  setNewTaskPriority(priority: Task['priority']): any;
  toggleNewTaskTodayDue(): any;
  setQuickAddMode(mode: 'do-now' | 'do-later'): any;
  toggleNewTaskReminder(): any;
  addReminderTime(): any;
  removeReminderTime(index: number): any;
  snoozeReminder(index: number, minutes: number): any;
  addNewTaskLabel(label: string): any;
  getLabelSuggestions(): string[];
  hideLabelAutocomplete(): any;
  removeNewTaskLabel(label: string): any;
  requestDeleteTask(task: Task, event: Event): any;
  cancelDeleteTask(): any;
  confirmNewTask(): any;
  handleFileDrop(event: DragEvent): any;
  formatFileSize(bytes: number): string;
  isImageFile(file: File): boolean;
  getFilePreview(file: File): string;
  previewImage(url: string): any;
  closeImagePreview(): any;
  addSubtaskToNew(): any;
  removeSubtask(index: number): any;
  onSidebarActiveChange(id: string): any;
  navigateMonth(direction: 'prev' | 'next'): any;
  onCalendarDayClick(day: { day: number; isCurrentMonth: boolean; isToday: boolean; isActive: boolean }): any;
  toggleDatePicker(event: Event): any;
  selectDate(day: number, isCurrentMonth: boolean): any;
  updateDueTime(time: string): any;
  navigateDatePickerMonth(direction: 'prev' | 'next'): any;
  getDatePickerDays(): any;
  getDatePickerMonth(): any;
  toggleFolderDropdown(event: Event): any;
  selectFolder(folderName: string): any;
  toggleCreateFolder(): any;
  createNewFolder(): any;
  onDocumentClick(event: MouseEvent): any;
  onKeyDown(event: KeyboardEvent): any;
  parseNaturalLanguage(input: string): {
    title: string;
    due?: string;
    priority?: Task['priority'];
    labels: string[];
  };
  getTomorrowDate(): string;
  getNextWeekday(dayName: string): string;
  getDateInDays(days: number): string;
  parseDate(month: string, day: string, year: string): string;
  handleQuickAdd(): any;
  onMetricClick(metric: 'today' | 'completed' | 'active' | 'priority'): any;
  toggleTaskStatus(task: Task): any;
  onQuickComplete(task: Task): any;
  deleteTask(task: Task): any;
  confirmDeleteTask(): any;
  toggleAllVisibleTasksStatus(): any;
  toggleTaskGroup(group: 'today' | 'upcoming' | 'noDueDate'): any;
  isGroupExpanded(group: 'today' | 'upcoming' | 'noDueDate'): boolean;
  getKanbanTasks(status: Task['status']): Task[];
  onKanbanDragStart(event: DragEvent, task: Task): any;
  onKanbanDrop(event: DragEvent, targetStatus: Task['status']): any;
  onKanbanDragOver(event: DragEvent): any;
  onKanbanDragLeave(event: DragEvent): any;
  navigateCalendarView(direction: 'prev' | 'next'): any;
  getCalendarViewMonth(): string;
  getCalendarViewDays(): any;
  getTasksForDate(date: Date): Task[];
  extractTime(dueString: string | undefined): string;
  getCompletedSubtasks(task: Task): number;
  getDependencyTitles(task: Task): string[];
  isTaskBlocked(task: Task): boolean;
  addSubtask(parentTask: Task, subtaskTitle: string): any;
  focusTask(task: Task): any;
  exitFocusMode(): any;
  openTaskDetails(task: Task): any;
  closeTaskDetails(): any;
  toggleEditTaskDetails(): any;
  saveTaskDetails(): any;
  deleteTaskFromDetails(): any;
  completeTaskFromDetails(): any;
  startPomodoroFromDetails(): any;
  addLabelToEdit(event: Event): any;
  removeLabelFromEdit(label: string): any;
  toggleSubtaskStatus(parentTask: Task, subtask: Task): any;
  isAttachmentImage(attachment: { name: string; type: string }): boolean;
  startPomodoro(task: Task): any;
  stopPomodoro(): any;
  formatPomodoroTime(seconds: number): string;
  ngOnInit(): any;
  initVoiceRecognition(): any;
  startVoiceInput(): any;
  stopVoiceInput(): any;
  isVoiceSupported(): boolean;
  openCameraCapture(): any;
  closeCameraCapture(): any;
  capturePhoto(): any;
  showErrorState(message: string): any;
  dismissError(): any;
  ngOnDestroy(): any;
  createRecurringTask(baseTask: Task, pattern: 'daily' | 'weekly' | 'monthly' | 'yearly', interval: number): any;
  calculateNextDue(currentDue: string | undefined, pattern: string, interval: number): string;
  getLabelColor(label: string): string;
  navigateTimeline(direction: 'prev' | 'next'): any;
  getTimelineTitle(): string;
  getTimelineTasks(): Task[];
  getTimelineDates(): Date[];
  getDateDay(date: Date): string;
  getDateWeekday(date: Date): string;
  isToday(date: Date): boolean;
  getTaskTimelineBar(task: Task): { startPercent: number; widthPercent: number; startDate: string; endDate: string } | null;
  parseDateFromString(dateStr: string): Date | null;
  onFileSelected(event: Event): any;
  removeFileToUpload(index: number): any;
  uploadFiles(taskId: string): Promise<void>;
  removeAttachment(taskId: string, attachmentId: string): any;
  toggleTaskSelection(taskId: string): any;
  selectAllTasks(): any;
  clearSelection(): any;
  bulkCompleteTasks(): any;
  bulkDeleteTasks(): any;
  bulkChangePriority(priority: Task['priority']): any;
  addToHistory(type: string, task: Task, previousState: Partial<Task>): any;
  undo(): any;
  redo(): any;
  onScroll(event: Event): any;
  toggleTheme(): any;
  setFontSize(size: 'small' | 'medium' | 'large'): any;
  renderMarkdown(text: string): string;
  getTaskById(id: string): Task | undefined;
  getAvailableDependencyTasks(): Task[];
  addDependency(taskId: string): any;
  removeDependency(taskId: string): any;
}
```

---

## File: /libs/feature-workspace/src/lib/workspace/workspace.component.ts

### Class: WorkspaceComponent
```typescript
class WorkspaceComponent {
  store: any;
  router: any;
  userService: any;
  notificationService: any;
  inputText: any;
  listening: any;
  liveTranscript: any;
  confidence: any;
  activeFilter: any;
  attachments: any;
  cpuUsage: any;
  latency: any;
  activeProjects: any;
  upcomingTasks: any;
  contextStream: any;
  stats: any;
  systemTime: any;
  linkedEntities: any;
  userName: any;
  handleKeyboard(event: KeyboardEvent): any;
  toggleVoice(): any;
  executeCommand(): any;
  handleNavigationCommand(command: string): any;
  clearCommand(): any;
  triggerFileUpload(): any;
  handleFiles(files: File[]): any;
  removeAttachment(index: number): any;
  toggleFilter(): any;
  openItem(item: any): any;
  openTask(task: any, event: Event): any;
  getGreeting(): string;
}
```

---

## File: /libs/ui/src/lib/add-new-modal/add-new-modal.component.ts

### Class: AddNewModalComponent
```typescript
class AddNewModalComponent {
  searchInput: ElementRef<HTMLInputElement>;
  optionsContainer: ElementRef<HTMLDivElement>;
  isOpen: any;
  searchQuery: any;
  isCreating: any;
  createdItem: any;
  focusedIndex: any;
  recentOptionIds: any;
  selectedCategoryId: any;
  categories: { id: OptionCategory; label: string; icon: string }[];
  options: AddNewOption[];
  sidebarCategories: { id: SidebarCategoryId; label: string; icon: string }[];
  itemCounts: any;
  filteredOptions: any;
  rightPaneOptions: any;
  flatVisibleOptions: any;
  visibleSidebarCategories: any;
  ngOnInit(): any;
  ngAfterViewInit(): any;
  ngOnDestroy(): any;
  open(): any;
  selectCategory(id: SidebarCategoryId): any;
  close(): any;
  onSearchChange(event: Event): any;
  clearSearch(): any;
  selectOption(option: AddNewOption): any;
  selectFocusedOption(): any;
  getOptionCount(optionId: string): number;
  isOptionFocused(option: AddNewOption): boolean;
  onBackdropClick(): any;
  onModalClick(event: Event): any;
  handleKeydown(event: KeyboardEvent): any;
  trackByOptionId(index: number, option: AddNewOption): string;
  trackByGroupLabel(index: number, group: { label: string }): string;
}
```

---

## File: /libs/ui/src/lib/badge/badge.component.ts

### Class: BadgeComponent
```typescript
class BadgeComponent {
  variant: BadgeVariant;
  pill: any;
}
```

### Type: BadgeVariant
```typescript
type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';
```

---

## File: /libs/ui/src/lib/button/button.component.ts

### Class: ButtonComponent
```typescript
class ButtonComponent {
  variant: ButtonVariant;
  size: ButtonSize;
  icon?: string;
  iconPos: 'left' | 'right';
  disabled: any;
  loading: any;
  type: 'button' | 'submit' | 'reset';
  clicked: any;
  onClick(): any;
}
```

### Type: ButtonVariant
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
```

### Type: ButtonSize
```typescript
type ButtonSize = 'sm' | 'md' | 'lg';
```

---

## File: /libs/ui/src/lib/empty-state/empty-state.component.ts

### Class: EmptyStateComponent
```typescript
class EmptyStateComponent {
  icon: any;
  title: any;
  description: any;
  compact: any;
}
```

---

## File: /libs/ui/src/lib/icon-button/icon-button.component.ts

### Class: IconButtonComponent
```typescript
class IconButtonComponent {
  icon: any;
  variant: IconButtonVariant;
  size: 28 | 32;
  disabled: any;
  type: 'button' | 'submit' | 'reset';
  active: any;
  title: any;
  clicked: any;
  onClick(): any;
}
```

### Type: IconButtonVariant
```typescript
type IconButtonVariant = 'primary' | 'ghost' | 'danger';
```

---

## File: /libs/ui/src/lib/input/input.component.ts

### Class: InputComponent
```typescript
class InputComponent {
  label: any;
  placeholder: any;
  type: 'text' | 'email' | 'password' | 'number';
  disabled: any;
  value: any;
  onChange: (v: string) => void;
  onTouched: () => void;
  writeValue(v: string): void;
  registerOnChange(fn: (v: string) => void): void;
  registerOnTouched(fn: () => void): void;
  setDisabledState(isDisabled: boolean): void;
  onInput(e: Event): any;
}
```

---

## File: /libs/ui/src/lib/logo/logo.component.ts

### Class: EnvLogoComponent
```typescript
class EnvLogoComponent {
  height: any;
  width: any;
}
```

---

## File: /libs/ui/src/lib/modal/modal.component.ts

### Class: ModalComponent
```typescript
class ModalComponent {
  isOpen: any;
  title: any;
  size: 'sm' | 'md' | 'large' | 'xl';
  showClose: any;
  closed: any;
  onOverlayClick(): any;
  onContainerClick(e: Event): any;
  onClose(): any;
}
```

---

## File: /libs/ui/src/lib/notification-center/notification-center.component.ts

### Class: NotificationCenterComponent
```typescript
class NotificationCenterComponent {
  isOpen: any;
  activeTab: any;
  notifications: any;
  unreadCount: any;
  filteredNotifications: any;
  open(): any;
  close(): any;
  toggle(): any;
  setActiveTab(tab: 'all' | 'unread'): any;
  markAsRead(id: string): any;
  markAllAsRead(): any;
  deleteNotification(id: string): any;
  clearAll(): any;
  clearRead(): any;
  handleNotificationClick(notification: Notification): any;
  handleAction(notification: Notification, event: Event): any;
  getDefaultIcon(type: NotificationType): string;
  getRelativeTime(date: Date): string;
  handleEscape(event: KeyboardEvent): any;
}
```

---

## File: /libs/ui/src/lib/profile-editor/profile-editor.component.ts

### Class: ProfileEditorComponent
```typescript
class ProfileEditorComponent {
  isOpen: any;
  user: any;
  userInitials: any;
  tempName: any;
  tempBio: any;
  tempAvatar: any;
  tempGender: 'male' | 'female';
  isSaving: any;
  isImageLoading: any;
  open(): any;
  close(): any;
  setAvatarOption(option: 'male' | 'female' | 'initials'): any;
  onImageLoad(): any;
  onImageError(): any;
  save(): any;
  handleEscape(event: Event): any;
}
```

---

## File: /libs/ui/src/lib/profile-menu/profile-menu.component.ts

### Class: ProfileMenuComponent
```typescript
class ProfileMenuComponent {
  isOpen: any;
  user: any;
  userInitials: any;
  onOpenProfile: any;
  onOpenSettings: any;
  open(): any;
  close(): any;
  toggle(): any;
  openProfile(): any;
  openSettings(): any;
  openActivity(): any;
  openDeveloperSettings(): any;
  openHelp(): any;
  openBin(): any;
  openKeyboardShortcuts(): any;
  toggleEmailNotifications(): any;
  toggleAutoBackup(): any;
  logout(): any;
  formatNumber(num: number): string;
  getMemberSince(): string;
  handleEscape(event: KeyboardEvent): any;
}
```

---

## File: /libs/ui/src/lib/quick-find/quick-find.component.ts

### Class: QuickFindComponent
```typescript
class QuickFindComponent {
  isOpen: any;
  searchQuery: any;
  selectedIndex: any;
  results: any;
  handleKeyboardShortcut(event: KeyboardEvent): any;
  open(): any;
  close(): any;
  performSearch(query: string): any;
  showRecentItems(): any;
  selectResult(result: QuickFindResult | undefined): any;
  onBackdropClick(): any;
  onModalClick(event: Event): any;
}
```

---

## File: /libs/ui/src/lib/settings-modal/settings-modal.component.ts

### Class: SettingsModalComponent
```typescript
class SettingsModalComponent {
  aiService: any;
  isOpen: any;
  activeSection: any;
  currentTheme: any;
  fontSize: any;
  compactMode: any;
  animations: any;
  navigationLayout: any;
  editorFont: any;
  lineHeight: any;
  autoSave: any;
  spellCheck: any;
  focusMode: any;
  desktopNotifications: any;
  soundEffects: any;
  dailySummary: any;
  analytics: any;
  aiProvider: any;
  aiModel: any;
  aiKey: any;
  sections: SettingsSection[];
  themes: ThemeOption[];
  aiProviders: AiProviderOption[];
  handleEscape(event: Event): any;
  open(): any;
  close(): any;
  setActiveSection(sectionId: string): any;
  setTheme(theme: Theme): any;
  setFontSize(event: Event): any;
  toggleCompactMode(): any;
  toggleAnimations(): any;
  setNavigationLayout(layout: 'vertical' | 'horizontal' | 'minimized'): any;
  setEditorFont(event: Event): any;
  setLineHeight(event: Event): any;
  toggleAutoSave(): any;
  toggleSpellCheck(): any;
  toggleFocusMode(): any;
  toggleDesktopNotifications(): any;
  toggleSoundEffects(): any;
  toggleDailySummary(): any;
  toggleAnalytics(): any;
  setAiProvider(provider: AiProvider): any;
  saveSettings(): any;
  resetToDefaults(): any;
}
```

---

## File: /libs/ui/src/lib/ui/ui.ts

### Class: Ui
```typescript
class Ui {
}
```

---

## File: /apps/desktop/src/app/components/activity-log/activity-log.component.ts

### Class: ActivityLogComponent
```typescript
class ActivityLogComponent {
  searchQuery: any;
  activeFilter: any;
  expandedRowId: any;
  allActivities: any;
  filteredActivities: any;
  totalCount: any;
  visibleCount: any;
  goBack(): any;
  setFilter(filter: 'ALL' | 'ENTRY' | 'SYSTEM' | 'SYNC' | 'AI'): any;
  updateSearch(event: Event): any;
  toggleRow(id: string): any;
}
```

---

## File: /apps/desktop/src/app/components/articles/articles.component.ts

### Class: ArticlesComponent
```typescript
class ArticlesComponent {
  articleService: any;
  articles: any;
  selectedPlatform: any;
  selectedPipeline: any;
  searchQuery: any;
  activeArticleId: any;
  showArticleModal: any;
  showDeleteModal: any;
  editingArticle: any;
  articleToDelete: any;
  newArticleTitle: any;
  newArticlePlatform: any;
  newArticlePipeline: any;
  newArticleContent: any;
  newArticleTags: any;
  newArticleUrl: any;
  newArticleScheduledDate: any;
  editNotes: any;
  filteredArticles: any;
  activeArticle: any;
  stats: any;
  platforms: any;
  pipelines: any;
  openArticleModal(article: Article): any;
  closeArticleModal(): any;
  saveArticle(): any;
  openArticle(article: Article): any;
  closeArticle(): any;
  requestDelete(article: Article, event: Event): any;
  confirmDelete(): any;
  cancelDelete(): any;
  getPipelineColor(pipeline: string): string;
  getIconForPipeline(pipeline: Article['pipeline']): string;
  formatDate(dateString: string): string;
  formatWordCount(count: number): string;
}
```

---

## File: /apps/desktop/src/app/components/bin/bin.component.ts

### Class: BinComponent
```typescript
class BinComponent {
  items: any;
  sortedItems: any;
  trackById(index: number, item: BinItem): any;
  formatType(type: string): string;
  permanentlyDelete(id: string): any;
  emptyBin(): any;
}
```

---

## File: /apps/desktop/src/app/components/books/books.component.ts

### Class: BooksComponent
```typescript
class BooksComponent {
  booksService: any;
  showAddModal: any;
  newBook: any;
  showDetailModal: any;
  editingBook: any;
  editedBook: any;
  newNoteInput: any;
  newNotePage: any;
  showQuickActions: any;
  showShortcutsHelp: any;
  filteredBooks: any;
  stats: any;
  booksByCategory: any;
  availableCategories: any;
  selectedBook: any;
  categories: BookCategory[];
  ngOnInit(): any;
  ngOnDestroy(): any;
  onDocumentClick(event: MouseEvent): any;
  onKeyDown(e: KeyboardEvent): any;
  openAddModal(): any;
  closeAddModal(): any;
  addBook(): any;
  openDetailModal(book: Book): any;
  closeDetailModal(): any;
  startEditing(): any;
  cancelEditing(): any;
  saveEditing(): any;
  deleteBook(book: Book): any;
  setStatus(book: Book, status: BookStatus): any;
  addNote(): any;
  removeNote(bookId: string, noteId: string): any;
  toggleQuickActions(bookId: string, ev: Event): any;
  getCategoryColor(cat: BookCategory): string;
  getStatusIcon(status: BookStatus): string;
  formatDate(iso: string): string;
  formatShortDate(iso: string): string;
  updateNewBook(key: K, value: Book[K]): any;
  updateEditedBook(key: K, value: Book[K]): any;
  openShortcutsHelp(): any;
  closeShortcutsHelp(): any;
}
```

---

## File: /apps/desktop/src/app/components/code-snippets/code-snippets.component.ts

### Class: CodeSnippetsComponent
```typescript
class CodeSnippetsComponent {
  snippetsService: any;
  showAddModal: any;
  newSnippet: any;
  showDetailModal: any;
  editingSnippet: any;
  editedSnippet: any;
  newTagInput: any;
  showQuickActions: any;
  showShortcutsHelp: any;
  filteredSnippets: any;
  stats: any;
  snippetsByLang: any;
  allTags: any;
  selectedSnippet: any;
  LANGS: any;
  ngOnInit(): any;
  ngOnDestroy(): any;
  onDocumentClick(event: MouseEvent): any;
  onKeyDown(e: KeyboardEvent): any;
  openAddModal(): any;
  closeAddModal(): any;
  addSnippet(): any;
  openDetailModal(snip: Snippet): any;
  closeDetailModal(): any;
  startEditing(): any;
  cancelEditing(): any;
  saveEditing(): any;
  deleteSnippet(snip: Snippet): any;
  copySnippet(snip: Snippet): any;
  toggleQuickActions(id: string, ev: Event): any;
  getLangColor(lang: SnippetLang): string;
  getLineNumbers(content: string): number[];
  formatRelative(iso: string): string;
  updateNewSnippet(key: K, value: Snippet[K]): any;
  updateEditedSnippet(key: K, value: Snippet[K]): any;
  addTagToNew(): any;
  removeTagFromNew(tag: string): any;
  openShortcutsHelp(): any;
  closeShortcutsHelp(): any;
}
```

---

## File: /apps/desktop/src/app/components/daily-notes/daily-notes.component.ts

### Class: DailyNotesComponent
```typescript
class DailyNotesComponent {
  editor: Editor;
  notes: any;
  wordCount: any;
  characterCount: any;
  activeModal: any;
  modalInputValue: any;
  modalInputPlaceholder: any;
  modalTitle: any;
  tempNoteId: any;
  selectedEntryId: any;
  searchQuery: any;
  selectedFilter: any;
  activeView: any;
  openNotes: any;
  noteGroups: any;
  tagCategories: any;
  showDropdown: any;
  displayModalTitle: any;
  filteredNotes: any;
  allGroupsCollapsed: any;
  allExpanded: any;
  selectedNote: any;
  allTagCategoriesExpanded: any;
  shareBtnText: any;
  handleEscape(event: Event): any;
  ngOnInit(): any;
  ngOnDestroy(): void;
  updateNoteContent(content: string, preview: string): any;
  handleNewNote(): any;
  selectNote(id: string): any;
  toggleGroup(groupId: string): any;
  setFilter(filter: string): any;
  isPinned(note: Note): boolean;
  togglePin(note: Note, event: Event): any;
  getNoteTags(note: Note): string[];
  expandAll(): any;
  collapseAll(): any;
  toggleDropdown(): any;
  handleNewFolder(): any;
  confirmNewFolder(): any;
  toggleExpandAll(): any;
  closeNoteTab(noteId: string, event: Event): any;
  getNoteById(id: string): Note | undefined;
  onDocumentClick(event: MouseEvent): any;
  switchView(view: 'folders' | 'tags'): any;
  toggleTagCategory(categoryId: string): any;
  toggleExpandAllTags(): any;
  updateNoteTitle(title: string): any;
  deleteCurrentNote(): any;
  requestDeleteNote(noteId: string, event: Event): any;
  confirmDeleteNote(): any;
  addTag(tag: string): any;
  removeTag(tag: string): any;
  promptAddTag(): any;
  confirmAddTag(): any;
  setLink(): any;
  confirmSetLink(): any;
  shareNote(): any;
  exportNote(): any;
  showMoreOptions(): any;
  addImage(): any;
  addYoutube(): any;
  confirmAddYoutube(): any;
  insertTable(): any;
  confirmAddImage(): any;
  copyShareLink(): any;
  downloadExport(format: 'pdf' | 'md' | 'html'): any;
  closeModal(): any;
}
```

---

## File: /apps/desktop/src/app/components/developer-settings/developer-settings.component.ts

### Class: DeveloperSettingsComponent
```typescript
class DeveloperSettingsComponent {
  isExporting: any;
  activeTab: any;
  searchQuery: any;
  tabs: any;
  tabGroups: any;
  activeTabData: any;
  tableRows: any;
  filteredCount: any;
  totalCount: any;
  copyFeedback: any;
  setActiveTab(id: string): any;
  goBack(): any;
  onSearchInput(e: Event): any;
  clearSearch(): any;
  formatColumnName(col: string): string;
  getCellValue(row: Record<string, unknown>, col: string): string;
  copyToClipboard(): any;
  exportData(): any;
}
```

### Interface: DataTab
```typescript
interface DataTab {
  id: string;
  label: string;
  icon: string;
  group: string;
  columns: string[];
  data: unknown[];
  count: number;
}
```

---

## File: /apps/desktop/src/app/components/journals/journals.component.ts

### Class: JournalsComponent
```typescript
class JournalsComponent {
  journalService: any;
  aiService: any;
  projects: any;
  entries: any;
  columns: any;
  searchQuery: any;
  projectSearchQuery: any;
  selectedFilter: any;
  viewMode: any;
  showEntryModal: any;
  showProjectModal: any;
  showSearchModal: any;
  showProjectDropdown: any;
  showColumnModal: any;
  showExportModal: any;
  showGoalsModal: any;
  selectedSort: any;
  selectedEntry: any;
  editingEntry: any;
  showAiPanel: any;
  aiQuery: any;
  aiResponse: any;
  isAiLoading: any;
  newEntryTitle: any;
  newEntryType: any;
  newEntryColumn: any;
  newProjectTitle: any;
  newColumnName: any;
  newColumnColor: any;
  exportFormat: any;
  exportEntryId: any;
  writingGoal: any;
  writingGoalPeriod: any;
  editor: Editor;
  wordCount: any;
  characterCount: any;
  activeProject: any;
  filteredEntries: any;
  timelineEntries: any;
  projectStats: any;
  draggedEntry: { entry: JournalEntry, sourceCol: string } | null;
  filteredProjects: any;
  totalProjects: any;
  totalEntries: any;
  totalWords: any;
  getEntriesForColumn(columnId: string): JournalEntry[];
  ngOnInit(): any;
  ngOnDestroy(): void;
  updateEntryContent(content: string, preview: string): any;
  updateEditingEntryTitle(title: string): any;
  setLink(): any;
  addImage(): any;
  insertTable(): any;
  selectProject(projectId: string): any;
  togglePin(entryId: string, event: Event): any;
  toggleSort(): any;
  onDragStart(e: DragEvent, entry: JournalEntry, sourceCol: string): any;
  onDragEnd(e: DragEvent): any;
  onDragOver(e: DragEvent): any;
  onDrop(e: DragEvent, targetCol: string): any;
  openNewEntryModal(column: string): any;
  createEntry(): any;
  openEntryDetail(entryId: string): any;
  closeEntryDetail(): any;
  saveEntry(): any;
  deleteEntry(entryId: string): any;
  createProject(): any;
  getColumnColor(columnId: string): string;
  getProjectColumns(): JournalColumn[];
  formatWordCount(count: number): string;
  toggleSearch(): any;
  getActiveProjectId(): string | undefined;
  openColumnModal(): any;
  createColumn(): any;
  deleteColumn(columnId: string): any;
  openExportModal(entryId: string): any;
  exportEntry(): any;
  openGoalsModal(): any;
  saveWritingGoal(): any;
  getWritingProgress(project: JournalProject): { current: number; target: number; percentage: number };
  getStreakDays(project: JournalProject): number;
  setViewMode(mode: 'kanban' | 'timeline'): any;
  toggleAiPanel(): any;
  askAi(): any;
  generateAiSuggestion(): any;
  insertAiContent(): any;
  toggleProjectDropdown(): any;
  requestDeleteProject(id: string, event: Event): any;
  onDocumentClick(event: MouseEvent): any;
}
```

---

## File: /apps/desktop/src/app/components/meetings/meetings.component.ts

### Class: MeetingsComponent
```typescript
class MeetingsComponent {
  meetingsService: any;
  viewMode: any;
  viewFilter: any;
  selectedProject: any;
  selectedTimeRange: any;
  sortBy: any;
  sortDirection: any;
  searchQuery: any;
  calendarDate: any;
  calendarView: any;
  showCreateModal: any;
  newMeeting: any;
  newAttendeeInput: any;
  newAgendaInput: any;
  newLabelInput: any;
  showRecurringOptions: any;
  recurringPattern: any;
  recurringCount: any;
  showDetailsModal: any;
  selectedMeeting: any;
  editingMeeting: any;
  editedMeeting: any;
  detailsTab: any;
  newActionItemInput: any;
  newActionItemAssignee: any;
  newActionItemPriority: any;
  newNoteInput: any;
  newAgendaItemTitle: any;
  newAgendaItemDuration: any;
  newAgendaItemPresenter: any;
  editingAgendaItem: any;
  showAddAttendee: any;
  newAttendeeName: any;
  newAttendeeEmail: any;
  newAttendeeRole: any;
  showDatePicker: any;
  datePickerDate: any;
  showQuickActions: any;
  showShortcutsHelp: any;
  meetingColors: any;
  filteredMeetings: any;
  calendarWeeks: any;
  availableProjects: any;
  upcomingSyncs: any;
  stats: any;
  meetingsByProject: any;
  hasNoProject: any;
  meetingsByStatus: any;
  getMeetingsForDate(date: Date): Meeting[];
  ngOnInit(): any;
  ngOnDestroy(): any;
  onDocumentClick(event: MouseEvent): any;
  handleKeyboardShortcuts(event: KeyboardEvent): any;
  openCreateModal(): any;
  closeCreateModal(): any;
  openShortcutsHelp(): any;
  closeShortcutsHelp(): any;
  createMeeting(): any;
  openDetailsModal(meeting: Meeting): any;
  closeDetailsModal(): any;
  startEditing(): any;
  saveEditing(): any;
  cancelEditing(): any;
  deleteMeeting(meeting: Meeting): any;
  cancelMeeting(meeting: Meeting): any;
  completeMeeting(meeting: Meeting): any;
  duplicateMeeting(meeting: Meeting): any;
  addAttendeeToNew(): any;
  removeAttendeeFromNew(attendeeId: string): any;
  addAttendeeToMeeting(): any;
  removeAttendee(attendeeId: string): any;
  addAgendaItemToNew(): any;
  removeAgendaItemFromNew(itemId: string): any;
  addAgendaItem(): any;
  toggleAgendaItem(itemId: string): any;
  deleteAgendaItem(itemId: string): any;
  addActionItem(): any;
  toggleActionItem(itemId: string): any;
  deleteActionItem(itemId: string): any;
  convertToTask(actionItem: ActionItem): any;
  addNote(): any;
  deleteNote(noteId: string): any;
  addLabelToNew(): any;
  removeLabelFromNew(label: string): any;
  previousMonth(): any;
  nextMonth(): any;
  goToToday(): any;
  isToday(date: Date): boolean;
  isCurrentMonth(date: Date): boolean;
  selectCalendarDate(date: Date): any;
  formatTime(time: string): string;
  formatDate(dateStr: string): string;
  formatFullDate(dateStr: string): string;
  getRelativeDate(dateStr: string): string;
  getMeetingTypeIcon(type: string): string;
  getPlatformIcon(platform: string): string;
  getStatusColor(status: string): string;
  getPriorityColor(priority: string): string;
  getOpenActionItemsCount(meeting: Meeting): number;
  getCompletedActionItemsCount(meeting: Meeting): number;
  getActionItemsProgress(meeting: Meeting): number;
  toggleQuickActions(meetingId: string, event: Event): any;
  joinMeeting(meeting: Meeting, event: Event): any;
  updateNewMeetingField(field: keyof Meeting, value: any): any;
  updateEditedMeetingField(field: keyof Meeting, value: any): any;
  trackByMeetingId(index: number, meeting: Meeting): string;
  trackByAttendeeId(index: number, attendee: Attendee): string;
  trackByAgendaId(index: number, item: AgendaItem): string;
  trackByActionId(index: number, item: ActionItem): string;
  trackByNoteId(index: number, note: MeetingNote): string;
}
```

---

## File: /apps/desktop/src/app/components/research/research.component.ts

### Class: ResearchComponent
```typescript
class ResearchComponent {
  researchService: any;
  viewMode: any;
  selectedLibrary: any;
  showLibraryModal: any;
  showSourceModal: any;
  showSummaryModal: any;
  showSourceDetailPanel: any;
  selectedSource: any;
  showDeleteLibraryModal: any;
  showDeleteSourceModal: any;
  libraryToDelete: any;
  sourceToDelete: any;
  searchQuery: any;
  filterStatus: any;
  filterType: any;
  newLibraryName: any;
  newLibraryDesc: any;
  newLibraryColor: any;
  newSourceTitle: any;
  newSourceUrl: any;
  newSourceType: any;
  newSourceTags: any;
  newSourceDesc: any;
  newSourceAuthor: any;
  newSummaryTitle: any;
  newSummaryContent: any;
  newSummaryTags: any;
  selectedSourceIds: any;
  showAIPanel: any;
  aiLoading: any;
  aiSuggestions: any;
  aiTopics: any;
  aiSourceAnalysis: any;
  showTopicDiscovery: any;
  discoveredTopics: any;
  showResearchPlanModal: any;
  researchPlanTopic: any;
  generatedPlan: any;
  editNotes: any;
  libraries: any;
  filteredLibraries: any;
  sources: any;
  summaries: any;
  filteredSources: any;
  sourceStats: any;
  openLibraryModal(): any;
  closeLibraryModal(): any;
  saveLibrary(): any;
  selectLibrary(library: ResearchLibrary): any;
  backToLibraries(): any;
  deleteLibrary(library: ResearchLibrary, event: Event): any;
  confirmDeleteLibrary(): any;
  cancelDeleteLibrary(): any;
  openSourceModal(): any;
  closeSourceModal(): any;
  saveSource(): any;
  openSourceDetail(source: ResearchSource): any;
  closeSourceDetail(): any;
  updateSourceStatus(status: 'UNREAD' | 'READING' | 'PROCESSED'): any;
  saveNotes(): any;
  deleteCurrentSource(): any;
  confirmDeleteSource(): any;
  cancelDeleteSource(): any;
  openSummaryModal(): any;
  closeSummaryModal(): any;
  saveSummary(): any;
  toggleSourceSelection(sourceId: string): any;
  isSourceSelected(sourceId: string): boolean;
  showSources(): any;
  showSummaries(): any;
  getStatusColor(status: string): any;
  getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error';
  getStatusClass(status: string): string;
  getStatClass(stat: string): string;
  getPriorityVariant(priority: string): 'default' | 'success' | 'warning' | 'error';
  getSourceIcon(type: string): any;
  getSourceTypeLabel(type: string): string;
  formatSourceMeta(source: ResearchSource): string;
  toggleAIPanel(): any;
  discoverTopics(): any;
  analyzeSource(_source: ResearchSource): any;
  generateAutoSummary(): any;
  suggestSources(): any;
  addSuggestedSource(suggestion: string): any;
  closeTopicDiscovery(): any;
  searchByTopic(topic: string): any;
  openResearchPlanModal(): any;
  closeResearchPlanModal(): any;
  generateResearchPlan(): any;
  implementResearchPlan(): any;
}
```

---

## File: /apps/desktop/src/app/core/errors/global-error.handler.ts

### Class: GlobalErrorHandler
```typescript
class GlobalErrorHandler {
  handleError(error: unknown): void;
}
```

---

## File: /apps/desktop/src/app/core/utils/tauri-helpers.ts

### Function: isTauriEnvironment
```typescript
function isTauriEnvironment(): boolean
```

### Function: logIfTauri
```typescript
function logIfTauri(message: string, error: any): void
```

### Function: createTauriErrorHandler
```typescript
function createTauriErrorHandler(message: string): (error: any) => void
```

---

## File: /apps/web/src/app/components/activity-log/activity-log.component.ts

### Class: ActivityLogComponent
```typescript
class ActivityLogComponent {
  searchQuery: any;
  activeFilter: any;
  expandedRowId: any;
  allActivities: any;
  filteredActivities: any;
  totalCount: any;
  visibleCount: any;
  goBack(): any;
  setFilter(filter: 'ALL' | 'ENTRY' | 'SYSTEM' | 'SYNC' | 'AI'): any;
  updateSearch(event: Event): any;
  toggleRow(id: string): any;
}
```

---

## File: /apps/web/src/app/components/articles/articles.component.ts

### Class: ArticlesComponent
```typescript
class ArticlesComponent {
  articleService: any;
  articles: any;
  selectedPlatform: any;
  selectedPipeline: any;
  searchQuery: any;
  activeArticleId: any;
  showArticleModal: any;
  showDeleteModal: any;
  editingArticle: any;
  articleToDelete: any;
  newArticleTitle: any;
  newArticlePlatform: any;
  newArticlePipeline: any;
  newArticleContent: any;
  newArticleTags: any;
  newArticleUrl: any;
  newArticleScheduledDate: any;
  editNotes: any;
  filteredArticles: any;
  activeArticle: any;
  stats: any;
  platforms: any;
  pipelines: any;
  openArticleModal(article: Article): any;
  closeArticleModal(): any;
  saveArticle(): any;
  openArticle(article: Article): any;
  closeArticle(): any;
  requestDelete(article: Article, event: Event): any;
  confirmDelete(): any;
  cancelDelete(): any;
  getPipelineColor(pipeline: string): string;
  getIconForPipeline(pipeline: Article['pipeline']): string;
  formatDate(dateString: string): string;
  formatWordCount(count: number): string;
}
```

---

## File: /apps/web/src/app/components/bin/bin.component.ts

### Class: BinComponent
```typescript
class BinComponent {
  items: any;
  sortedItems: any;
  trackById(index: number, item: BinItem): any;
  formatType(type: string): string;
  permanentlyDelete(id: string): any;
  emptyBin(): any;
}
```

---

## File: /apps/web/src/app/components/books/books.component.ts

### Class: BooksComponent
```typescript
class BooksComponent {
  booksService: any;
  showAddModal: any;
  newBook: any;
  showDetailModal: any;
  editingBook: any;
  editedBook: any;
  newNoteInput: any;
  newNotePage: any;
  showQuickActions: any;
  showShortcutsHelp: any;
  filteredBooks: any;
  stats: any;
  booksByCategory: any;
  availableCategories: any;
  selectedBook: any;
  categories: BookCategory[];
  ngOnInit(): any;
  ngOnDestroy(): any;
  onDocumentClick(event: MouseEvent): any;
  onKeyDown(e: KeyboardEvent): any;
  openAddModal(): any;
  closeAddModal(): any;
  addBook(): any;
  openDetailModal(book: Book): any;
  closeDetailModal(): any;
  startEditing(): any;
  cancelEditing(): any;
  saveEditing(): any;
  deleteBook(book: Book): any;
  setStatus(book: Book, status: BookStatus): any;
  addNote(): any;
  removeNote(bookId: string, noteId: string): any;
  toggleQuickActions(bookId: string, ev: Event): any;
  getCategoryColor(cat: BookCategory): string;
  getStatusIcon(status: BookStatus): string;
  formatDate(iso: string): string;
  formatShortDate(iso: string): string;
  updateNewBook(key: K, value: Book[K]): any;
  updateEditedBook(key: K, value: Book[K]): any;
  openShortcutsHelp(): any;
  closeShortcutsHelp(): any;
}
```

---

## File: /apps/web/src/app/components/code-snippets/code-snippets.component.ts

### Class: CodeSnippetsComponent
```typescript
class CodeSnippetsComponent {
  snippetsService: any;
  showAddModal: any;
  newSnippet: any;
  showDetailModal: any;
  editingSnippet: any;
  editedSnippet: any;
  newTagInput: any;
  showQuickActions: any;
  showShortcutsHelp: any;
  filteredSnippets: any;
  stats: any;
  snippetsByLang: any;
  allTags: any;
  selectedSnippet: any;
  LANGS: any;
  ngOnInit(): any;
  ngOnDestroy(): any;
  onDocumentClick(event: MouseEvent): any;
  onKeyDown(e: KeyboardEvent): any;
  openAddModal(): any;
  closeAddModal(): any;
  addSnippet(): any;
  openDetailModal(snip: Snippet): any;
  closeDetailModal(): any;
  startEditing(): any;
  cancelEditing(): any;
  saveEditing(): any;
  deleteSnippet(snip: Snippet): any;
  copySnippet(snip: Snippet): any;
  toggleQuickActions(id: string, ev: Event): any;
  getLangColor(lang: SnippetLang): string;
  getLineNumbers(content: string): number[];
  formatRelative(iso: string): string;
  updateNewSnippet(key: K, value: Snippet[K]): any;
  updateEditedSnippet(key: K, value: Snippet[K]): any;
  addTagToNew(): any;
  removeTagFromNew(tag: string): any;
  openShortcutsHelp(): any;
  closeShortcutsHelp(): any;
}
```

---

## File: /apps/web/src/app/components/daily-notes/daily-notes.component.ts

### Class: DailyNotesComponent
```typescript
class DailyNotesComponent {
  editor: Editor;
  notes: any;
  wordCount: any;
  characterCount: any;
  activeModal: any;
  modalInputValue: any;
  modalInputPlaceholder: any;
  modalTitle: any;
  tempNoteId: any;
  selectedEntryId: any;
  searchQuery: any;
  selectedFilter: any;
  activeView: any;
  openNotes: any;
  noteGroups: any;
  tagCategories: any;
  showDropdown: any;
  displayModalTitle: any;
  filteredNotes: any;
  allGroupsCollapsed: any;
  allExpanded: any;
  selectedNote: any;
  allTagCategoriesExpanded: any;
  shareBtnText: any;
  handleEscape(event: Event): any;
  ngOnInit(): any;
  ngOnDestroy(): void;
  updateNoteContent(content: string, preview: string): any;
  handleNewNote(): any;
  selectNote(id: string): any;
  toggleGroup(groupId: string): any;
  setFilter(filter: string): any;
  isPinned(note: Note): boolean;
  togglePin(note: Note, event: Event): any;
  getNoteTags(note: Note): string[];
  expandAll(): any;
  collapseAll(): any;
  toggleDropdown(): any;
  handleNewFolder(): any;
  confirmNewFolder(): any;
  toggleExpandAll(): any;
  closeNoteTab(noteId: string, event: Event): any;
  getNoteById(id: string): Note | undefined;
  onDocumentClick(event: MouseEvent): any;
  switchView(view: 'folders' | 'tags'): any;
  toggleTagCategory(categoryId: string): any;
  toggleExpandAllTags(): any;
  updateNoteTitle(title: string): any;
  deleteCurrentNote(): any;
  requestDeleteNote(noteId: string, event: Event): any;
  confirmDeleteNote(): any;
  addTag(tag: string): any;
  removeTag(tag: string): any;
  promptAddTag(): any;
  confirmAddTag(): any;
  setLink(): any;
  confirmSetLink(): any;
  shareNote(): any;
  exportNote(): any;
  showMoreOptions(): any;
  addImage(): any;
  addYoutube(): any;
  confirmAddYoutube(): any;
  insertTable(): any;
  confirmAddImage(): any;
  copyShareLink(): any;
  downloadExport(format: 'pdf' | 'md' | 'html'): any;
  closeModal(): any;
}
```

---

## File: /apps/web/src/app/components/developer-settings/developer-settings.component.ts

### Class: DeveloperSettingsComponent
```typescript
class DeveloperSettingsComponent {
  isImporting: any;
  activeTab: any;
  searchQuery: any;
  tabs: any;
  tabGroups: any;
  activeTabData: any;
  tableRows: any;
  filteredCount: any;
  totalCount: any;
  copyFeedback: any;
  setActiveTab(id: string): any;
  goBack(): any;
  onSearchInput(e: Event): any;
  clearSearch(): any;
  formatColumnName(col: string): string;
  getCellValue(row: Record<string, unknown>, col: string): string;
  copyToClipboard(): any;
  onImportFile(event: Event): any;
}
```

### Interface: DataTab
```typescript
interface DataTab {
  id: string;
  label: string;
  icon: string;
  group: string;
  columns: string[];
  data: unknown[];
  count: number;
}
```

---

## File: /apps/web/src/app/components/journals/journals.component.ts

### Class: JournalsComponent
```typescript
class JournalsComponent {
  journalService: any;
  aiService: any;
  projects: any;
  entries: any;
  columns: any;
  searchQuery: any;
  projectSearchQuery: any;
  selectedFilter: any;
  viewMode: any;
  showEntryModal: any;
  showProjectModal: any;
  showSearchModal: any;
  showProjectDropdown: any;
  showColumnModal: any;
  showExportModal: any;
  showGoalsModal: any;
  selectedSort: any;
  selectedEntry: any;
  editingEntry: any;
  showAiPanel: any;
  aiQuery: any;
  aiResponse: any;
  isAiLoading: any;
  newEntryTitle: any;
  newEntryType: any;
  newEntryColumn: any;
  newProjectTitle: any;
  newColumnName: any;
  newColumnColor: any;
  exportFormat: any;
  exportEntryId: any;
  writingGoal: any;
  writingGoalPeriod: any;
  editor: Editor;
  wordCount: any;
  characterCount: any;
  activeProject: any;
  filteredEntries: any;
  timelineEntries: any;
  projectStats: any;
  draggedEntry: { entry: JournalEntry, sourceCol: string } | null;
  filteredProjects: any;
  totalProjects: any;
  totalEntries: any;
  totalWords: any;
  getEntriesForColumn(columnId: string): JournalEntry[];
  ngOnInit(): any;
  ngOnDestroy(): void;
  updateEntryContent(content: string, preview: string): any;
  updateEditingEntryTitle(title: string): any;
  setLink(): any;
  addImage(): any;
  insertTable(): any;
  selectProject(projectId: string): any;
  togglePin(entryId: string, event: Event): any;
  toggleSort(): any;
  onDragStart(e: DragEvent, entry: JournalEntry, sourceCol: string): any;
  onDragEnd(e: DragEvent): any;
  onDragOver(e: DragEvent): any;
  onDrop(e: DragEvent, targetCol: string): any;
  openNewEntryModal(column: string): any;
  createEntry(): any;
  openEntryDetail(entryId: string): any;
  closeEntryDetail(): any;
  saveEntry(): any;
  deleteEntry(entryId: string): any;
  createProject(): any;
  getColumnColor(columnId: string): string;
  getProjectColumns(): JournalColumn[];
  formatWordCount(count: number): string;
  toggleSearch(): any;
  getActiveProjectId(): string | undefined;
  openColumnModal(): any;
  createColumn(): any;
  deleteColumn(columnId: string): any;
  openExportModal(entryId: string): any;
  exportEntry(): any;
  openGoalsModal(): any;
  saveWritingGoal(): any;
  getWritingProgress(project: JournalProject): { current: number; target: number; percentage: number };
  getStreakDays(project: JournalProject): number;
  setViewMode(mode: 'kanban' | 'timeline'): any;
  toggleAiPanel(): any;
  askAi(): any;
  generateAiSuggestion(): any;
  insertAiContent(): any;
  toggleProjectDropdown(): any;
  requestDeleteProject(id: string, event: Event): any;
  onDocumentClick(event: MouseEvent): any;
}
```

---

## File: /apps/web/src/app/components/meetings/meetings.component.ts

### Class: MeetingsComponent
```typescript
class MeetingsComponent {
  meetingsService: any;
  viewMode: any;
  viewFilter: any;
  selectedProject: any;
  selectedTimeRange: any;
  sortBy: any;
  sortDirection: any;
  searchQuery: any;
  calendarDate: any;
  calendarView: any;
  showCreateModal: any;
  newMeeting: any;
  newAttendeeInput: any;
  newAgendaInput: any;
  newLabelInput: any;
  showRecurringOptions: any;
  recurringPattern: any;
  recurringCount: any;
  showDetailsModal: any;
  selectedMeeting: any;
  editingMeeting: any;
  editedMeeting: any;
  detailsTab: any;
  newActionItemInput: any;
  newActionItemAssignee: any;
  newActionItemPriority: any;
  newNoteInput: any;
  newAgendaItemTitle: any;
  newAgendaItemDuration: any;
  newAgendaItemPresenter: any;
  editingAgendaItem: any;
  showAddAttendee: any;
  newAttendeeName: any;
  newAttendeeEmail: any;
  newAttendeeRole: any;
  showDatePicker: any;
  datePickerDate: any;
  showQuickActions: any;
  showShortcutsHelp: any;
  meetingColors: any;
  filteredMeetings: any;
  calendarWeeks: any;
  availableProjects: any;
  upcomingSyncs: any;
  stats: any;
  meetingsByProject: any;
  hasNoProject: any;
  meetingsByStatus: any;
  getMeetingsForDate(date: Date): Meeting[];
  ngOnInit(): any;
  ngOnDestroy(): any;
  onDocumentClick(event: MouseEvent): any;
  handleKeyboardShortcuts(event: KeyboardEvent): any;
  openCreateModal(): any;
  closeCreateModal(): any;
  openShortcutsHelp(): any;
  closeShortcutsHelp(): any;
  createMeeting(): any;
  openDetailsModal(meeting: Meeting): any;
  closeDetailsModal(): any;
  startEditing(): any;
  saveEditing(): any;
  cancelEditing(): any;
  deleteMeeting(meeting: Meeting): any;
  cancelMeeting(meeting: Meeting): any;
  completeMeeting(meeting: Meeting): any;
  duplicateMeeting(meeting: Meeting): any;
  addAttendeeToNew(): any;
  removeAttendeeFromNew(attendeeId: string): any;
  addAttendeeToMeeting(): any;
  removeAttendee(attendeeId: string): any;
  addAgendaItemToNew(): any;
  removeAgendaItemFromNew(itemId: string): any;
  addAgendaItem(): any;
  toggleAgendaItem(itemId: string): any;
  deleteAgendaItem(itemId: string): any;
  addActionItem(): any;
  toggleActionItem(itemId: string): any;
  deleteActionItem(itemId: string): any;
  convertToTask(actionItem: ActionItem): any;
  addNote(): any;
  deleteNote(noteId: string): any;
  addLabelToNew(): any;
  removeLabelFromNew(label: string): any;
  previousMonth(): any;
  nextMonth(): any;
  goToToday(): any;
  isToday(date: Date): boolean;
  isCurrentMonth(date: Date): boolean;
  selectCalendarDate(date: Date): any;
  formatTime(time: string): string;
  formatDate(dateStr: string): string;
  formatFullDate(dateStr: string): string;
  getRelativeDate(dateStr: string): string;
  getMeetingTypeIcon(type: string): string;
  getPlatformIcon(platform: string): string;
  getStatusColor(status: string): string;
  getPriorityColor(priority: string): string;
  getOpenActionItemsCount(meeting: Meeting): number;
  getCompletedActionItemsCount(meeting: Meeting): number;
  getActionItemsProgress(meeting: Meeting): number;
  toggleQuickActions(meetingId: string, event: Event): any;
  joinMeeting(meeting: Meeting, event: Event): any;
  updateNewMeetingField(field: keyof Meeting, value: any): any;
  updateEditedMeetingField(field: keyof Meeting, value: any): any;
  trackByMeetingId(index: number, meeting: Meeting): string;
  trackByAttendeeId(index: number, attendee: Attendee): string;
  trackByAgendaId(index: number, item: AgendaItem): string;
  trackByActionId(index: number, item: ActionItem): string;
  trackByNoteId(index: number, note: MeetingNote): string;
}
```

---

## File: /apps/web/src/app/components/overview/overview.component.ts

### Class: OverviewComponent
```typescript
class OverviewComponent {
  store: any;
  userService: any;
  user: any;
  wordCount: any;
  streak: any;
  streakClass: any;
  currentDate: any;
  viewMode: any;
  currentMonth: any;
  days: any;
  planningItems: any;
  calendarPlaceholders: any;
  weekDays: any;
  toggleAutoSchedule(): any;
  setViewMode(mode: 'MONTH' | '2 WEEKS'): any;
  changeMonth(delta: number): any;
  generateCalendar(): any;
  formatNumber(num: number): string;
}
```

---

## File: /apps/web/src/app/components/research/research.component.ts

### Class: ResearchComponent
```typescript
class ResearchComponent {
  researchService: any;
  viewMode: any;
  selectedLibrary: any;
  showLibraryModal: any;
  showSourceModal: any;
  showSummaryModal: any;
  showSourceDetailPanel: any;
  selectedSource: any;
  showDeleteLibraryModal: any;
  showDeleteSourceModal: any;
  libraryToDelete: any;
  sourceToDelete: any;
  searchQuery: any;
  filterStatus: any;
  filterType: any;
  newLibraryName: any;
  newLibraryDesc: any;
  newLibraryColor: any;
  newSourceTitle: any;
  newSourceUrl: any;
  newSourceType: any;
  newSourceTags: any;
  newSourceDesc: any;
  newSourceAuthor: any;
  newSummaryTitle: any;
  newSummaryContent: any;
  newSummaryTags: any;
  selectedSourceIds: any;
  showAIPanel: any;
  aiLoading: any;
  aiSuggestions: any;
  aiTopics: any;
  aiSourceAnalysis: any;
  showTopicDiscovery: any;
  discoveredTopics: any;
  showResearchPlanModal: any;
  researchPlanTopic: any;
  generatedPlan: any;
  editNotes: any;
  libraries: any;
  filteredLibraries: any;
  sources: any;
  summaries: any;
  filteredSources: any;
  sourceStats: any;
  openLibraryModal(): any;
  closeLibraryModal(): any;
  saveLibrary(): any;
  selectLibrary(library: ResearchLibrary): any;
  backToLibraries(): any;
  deleteLibrary(library: ResearchLibrary, event: Event): any;
  confirmDeleteLibrary(): any;
  cancelDeleteLibrary(): any;
  openSourceModal(): any;
  closeSourceModal(): any;
  saveSource(): any;
  openSourceDetail(source: ResearchSource): any;
  closeSourceDetail(): any;
  updateSourceStatus(status: 'UNREAD' | 'READING' | 'PROCESSED'): any;
  saveNotes(): any;
  deleteCurrentSource(): any;
  confirmDeleteSource(): any;
  cancelDeleteSource(): any;
  openSummaryModal(): any;
  closeSummaryModal(): any;
  saveSummary(): any;
  toggleSourceSelection(sourceId: string): any;
  isSourceSelected(sourceId: string): boolean;
  showSources(): any;
  showSummaries(): any;
  getStatusColor(status: string): any;
  getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error';
  getStatusClass(status: string): string;
  getStatClass(stat: string): string;
  getPriorityVariant(priority: string): 'default' | 'success' | 'warning' | 'error';
  getSourceIcon(type: string): any;
  getSourceTypeLabel(type: string): string;
  formatSourceMeta(source: ResearchSource): string;
  toggleAIPanel(): any;
  discoverTopics(): any;
  analyzeSource(_source: ResearchSource): any;
  generateAutoSummary(): any;
  suggestSources(): any;
  addSuggestedSource(suggestion: string): any;
  closeTopicDiscovery(): any;
  searchByTopic(topic: string): any;
  openResearchPlanModal(): any;
  closeResearchPlanModal(): any;
  generateResearchPlan(): any;
  implementResearchPlan(): any;
}
```

---

## File: /apps/web/src/app/core/errors/global-error.handler.ts

### Class: GlobalErrorHandler
```typescript
class GlobalErrorHandler {
  handleError(error: unknown): void;
}
```

---

## File: /apps/web/src/app/core/utils/tauri-helpers.ts

### Function: isTauriEnvironment
```typescript
function isTauriEnvironment(): boolean
```

### Function: logIfTauri
```typescript
function logIfTauri(message: string, error: any): void
```

### Function: createTauriErrorHandler
```typescript
function createTauriErrorHandler(message: string): (error: any) => void
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/novel-editor.component.ts

### Class: NovelEditorComponent
```typescript
class NovelEditorComponent {
  editor: Editor;
  novelService: any;
  versionHistoryService: any;
  aiService: any;
  route: any;
  addInputRef: ElementRef<HTMLInputElement>;
  title: any;
  activeChapterId: any;
  wordCount: any;
  rightSidebarTab: any;
  activeNav: any;
  activeFrontMatterId: any;
  activePrologueId: any;
  focusMode: any;
  fullScreenMode: any;
  leftSidebarCollapsed: any;
  rightSidebarCollapsed: any;
  searchOpen: any;
  searchQuery: any;
  exportMenuOpen: any;
  selectedChapters: any;
  bulkMode: any;
  sessionStartTime: any;
  elapsedSeconds: any;
  targetWordCount: any;
  isSaving: any;
  lastSaved: any;
  versionHistoryOpen: any;
  versionHistory: any;
  canUndo: any;
  canRedo: any;
  aiMessages: any;
  aiLoading: any;
  aiError: any;
  aiPrompt: any;
  aiSuggestions: any;
  showContextPreview: any;
  novel: any;
  isLoading: any;
  activeCharacter: any;
  activeLocation: any;
  activeChapter: any;
  chapterStatus: any;
  chapterLastEdited: any;
  deleteModal: any;
  addMenuOpen: any;
  addModal: any;
  selectedCharacterId: any;
  selectedLocationId: any;
  totalNovelWords: any;
  averageChapterLength: any;
  chaptersCompleted: any;
  mentionedCharacters: any;
  mentionedLocations: any;
  dragStartIndex: any;
  dragOverIndex: any;
  filteredChapters: any;
  linkModalOpen: any;
  linkUrl: any;
  linkText: any;
  toggleContextPreview(): any;
  ngOnInit(): any;
  ngAfterViewChecked(): any;
  ngOnDestroy(): any;
  goBack(): any;
  toggleChapter(group: ChapterGroup): any;
  selectChapter(chapter: Chapter | { id: string }): any;
  setActiveTab(tab: 'ai' | 'notes' | 'manuscript'): any;
  setActiveNav(nav: 'manuscript' | 'structure' | 'characters' | 'locations'): any;
  onTitleChange(newTitle: string): any;
  requestDelete(type: 'chapter' | 'group' | 'character' | 'location' | 'note', id: string, name: string): any;
  confirmDelete(): any;
  cancelDelete(): any;
  onDocumentClick(event: MouseEvent): any;
  onKeyDown(event: KeyboardEvent): any;
  addNewChapter(groupId: string): any;
  confirmAdd(): any;
  cancelAdd(): any;
  updateAddModalInput(value: string): any;
  updateAddModalInput2(value: string): any;
  addNewActOrPart(): any;
  toggleAddMenu(): any;
  deleteChapter(chapterId: string, title: string): any;
  deleteGroup(groupId: string, title: string): any;
  addNewNote(): any;
  deleteNote(noteId: string): any;
  addNewCharacter(): any;
  selectCharacter(charId: string): any;
  updateCharacterField(charId: string, field: string, value: string): any;
  onCharacterFieldUpdate(data: { id: string; field: string; value: string }): any;
  deleteCharacter(charId: string, name: string): any;
  addNewLocation(): any;
  selectLocation(locId: string): any;
  updateLocationField(locId: string, field: string, value: string): any;
  onLocationFieldUpdate(data: { id: string; field: string; value: string }): any;
  deleteLocation(locId: string, name: string): any;
  getFormattedTime(): string;
  getGoalProgress(): number;
  getTotalChapters(): number;
  getFrontMatterTypeLabel(type: string): string;
  getFrontMatterTypeIcon(type: string): string;
  addFrontMatterItem(type: 'title-page' | 'copyright' | 'toc' | 'dedication' | 'foreword' | 'preface'): any;
  selectFrontMatterItem(itemId: string): any;
  selectPrologue(): any;
  addPrologue(): any;
  deletePrologue(): any;
  deleteFrontMatterItem(itemId: string, title: string): any;
  updateUndoRedoState(contentId: string, contentType: 'chapter' | 'frontMatter' | 'prologue'): any;
  performUndo(): any;
  performRedo(): any;
  openVersionHistory(): any;
  closeVersionHistory(): any;
  restoreVersion(versionId: string): any;
  onDragStart(event: DragEvent, index: number, type: 'chapter' | 'group'): any;
  onDragOver(event: DragEvent, index: number): any;
  onDragEnd(): any;
  onDrop(event: DragEvent, dropIndex: number, type: 'chapter' | 'group', groupId: string): any;
  selectSearchResult(result: { type: string, id: string }): any;
  toggleFocusMode(): any;
  getCurrentContext(): string;
  getSelectedText(): string;
  sendAiMessage(prompt: string): any;
  analyzeToneAndPacing(): any;
  generateSuggestions(): any;
  summarizeChapter(): any;
  continueWriting(): any;
  applySuggestion(suggestion: AiSuggestion): any;
  clearAiConversation(): any;
  getTokenCount(): number;
  formatMessage(content: string): string;
  formatTime(date: Date): string;
  toggleFullScreen(): any;
  toggleBulkMode(): any;
  toggleChapterSelection(chapterId: string): any;
  bulkDeleteChapters(): any;
  bulkMoveChapters(targetGroupId: string): any;
  toggleLeftSidebar(): any;
  toggleRightSidebar(): any;
  toggleSearch(): any;
  toggleExportMenu(): any;
  openLinkModal(): any;
  insertLink(): any;
  cancelLinkModal(): any;
  addImage(): any;
  insertTable(): any;
  addYoutube(): any;
  exportNovel(format: 'pdf' | 'docx' | 'md' | 'html'): any;
}
```

---

## File: /libs/ui/src/lib/auth/login/login.component.ts

### Class: LoginComponent
```typescript
class LoginComponent {
  authService: any;
  router: any;
  email: any;
  password: any;
  loading: any;
  error: any;
  handleLogin(): any;
  handleSignUp(): any;
  continueAsGuest(): any;
}
```

---

## File: /libs/ui/src/lib/auth/sign-up/sign-up.component.ts

### Class: SignUpComponent
```typescript
class SignUpComponent {
  authService: any;
  currentStep: any;
  totalSteps: any;
  formData: any;
  loading: any;
  error: any;
  steps: any;
  nextStep(): any;
  prevStep(): any;
  selectRole(role: string): any;
  updateStepStatuses(): any;
  validateStep(step: number): boolean;
  completeSignUp(): any;
}
```

---

## File: /libs/ui/src/lib/layout/footer/footer.component.ts

### Class: FooterComponent
```typescript
class FooterComponent {
  currentStreak: any;
  sessionDuration: any;
  appVersion: any;
  ngOnInit(): any;
  ngOnDestroy(): any;
  streakIndicator(index: number): boolean;
}
```

---

## File: /libs/ui/src/lib/layout/header/header.component.ts

### Class: HeaderComponent
```typescript
class HeaderComponent {
  activeTab: any;
  isImmersive: any;
  sidebarCollapsedChange: any;
  quickFind?: QuickFindComponent;
  addNewModal?: AddNewModalComponent;
  settingsModal?: SettingsModalComponent;
  notificationCenter?: NotificationCenterComponent;
  profileMenu?: ProfileMenuComponent;
  profileEditor?: ProfileEditorComponent;
  themeService: any;
  notificationService: any;
  userService: any;
  unreadCount: any;
  user: any;
  userInitials: any;
  navigationLayout: any;
  isAvatarLoading: any;
  sidebarCollapsed: any;
  tabs: any;
  tabIcons: Record<string, string>;
  getThemeIcon(): string;
  getNextTheme(): string;
  toggleTheme(): any;
  onAvatarLoad(): any;
  onAvatarError(): any;
  navigateTo(tab: string): any;
  openQuickFind(): any;
  openAddNew(): any;
  openSettings(): any;
  openNotifications(): any;
  openProfileMenu(): any;
  handleOpenSettings(): any;
  handleOpenProfile(): any;
  toggleSidebar(): any;
  getTabIcon(tab: string): string;
  ngOnInit(): any;
  ngOnDestroy(): any;
}
```

---

## File: /libs/ui/src/lib/layout/sidebar/sidebar.component.ts

### Class: SidebarComponent
```typescript
class SidebarComponent {
  title: any;
  subtitle: any;
  searchPlaceholder: any;
  searchQuery: any;
  searchChange: any;
  items: SidebarNavItem[];
  activeId: string | null;
  activeIdChange: any;
  addIcon: string | null;
  addTooltip: any;
  addClicked: any;
  showFooter: any;
  onSearchInput(value: string): any;
  onSelectItem(id: string): any;
  onAddClick(): any;
}
```

### Interface: SidebarNavItem
```typescript
interface SidebarNavItem {
  id: string;
  icon: string;
  label: string;
  count?: number | string;
}
```

---

## File: /apps/desktop/src/app/components/dashboard/global-tasks/global-tasks.component.ts

### Class: GlobalTasksComponent
```typescript
class GlobalTasksComponent {
  tasks: any;
  highPriorityCount: any;
  getPriorityColor(priority: string): string;
}
```

---

## File: /apps/desktop/src/app/components/dashboard/metrics/metrics.component.ts

### Class: MetricsComponent
```typescript
class MetricsComponent {
}
```

---

## File: /apps/desktop/src/app/components/dashboard/project-oversight/project-oversight.component.ts

### Class: ProjectOversightComponent
```typescript
class ProjectOversightComponent {
  projects: any;
  getStatusColor(status: string): string;
}
```

---

## File: /apps/desktop/src/app/components/dashboard/recent-activity/recent-activity.component.ts

### Class: RecentActivityComponent
```typescript
class RecentActivityComponent {
  activities: any;
  viewAll(): any;
}
```

---

## File: /apps/desktop/src/app/components/errors/not-found/not-found.component.ts

### Class: NotFoundComponent
```typescript
class NotFoundComponent {
}
```

---

## File: /apps/desktop/src/app/components/errors/server-error/server-error.component.ts

### Class: ServerErrorComponent
```typescript
class ServerErrorComponent {
  message: any;
}
```

---

## File: /apps/desktop/src/app/components/projects/project-details/project-details.component.ts

### Class: ProjectDetailsComponent
```typescript
class ProjectDetailsComponent {
  store: any;
  projectId: any;
  newTaskTitle: any;
  project: any;
  projectTasks: any;
  linkedNovels: any;
  linkedJournals: any;
  linkedMeetings: any;
  linkedBooks: any;
  linkedResearch: any;
  linkedSnippets: any;
  linkedArticles: any;
  linkedJournalProjects: any;
  addTask(): any;
  deleteTask(taskId: string): any;
  finalizeSession(): any;
  getStatusColor(status: string): string;
  getPriorityColor(priority: string): string;
}
```

---

## File: /apps/web/src/app/components/dashboard/global-tasks/global-tasks.component.ts

### Class: GlobalTasksComponent
```typescript
class GlobalTasksComponent {
  tasks: any;
  highPriorityCount: any;
  getPriorityColor(priority: string): string;
}
```

---

## File: /apps/web/src/app/components/dashboard/metrics/metrics.component.ts

### Class: MetricsComponent
```typescript
class MetricsComponent {
}
```

---

## File: /apps/web/src/app/components/dashboard/project-oversight/project-oversight.component.ts

### Class: ProjectOversightComponent
```typescript
class ProjectOversightComponent {
  projects: any;
  getStatusColor(status: string): string;
}
```

---

## File: /apps/web/src/app/components/dashboard/recent-activity/recent-activity.component.ts

### Class: RecentActivityComponent
```typescript
class RecentActivityComponent {
  activities: any;
  viewAll(): any;
}
```

---

## File: /apps/web/src/app/components/errors/not-found/not-found.component.ts

### Class: NotFoundComponent
```typescript
class NotFoundComponent {
}
```

---

## File: /apps/web/src/app/components/errors/server-error/server-error.component.ts

### Class: ServerErrorComponent
```typescript
class ServerErrorComponent {
  message: any;
}
```

---

## File: /apps/web/src/app/components/projects/project-details/project-details.component.ts

### Class: ProjectDetailsComponent
```typescript
class ProjectDetailsComponent {
  store: any;
  projectId: any;
  newTaskTitle: any;
  project: any;
  projectTasks: any;
  linkedNovels: any;
  linkedJournals: any;
  linkedMeetings: any;
  linkedBooks: any;
  linkedResearch: any;
  linkedSnippets: any;
  linkedArticles: any;
  linkedJournalProjects: any;
  addTask(): any;
  deleteTask(taskId: string): any;
  finalizeSession(): any;
  getStatusColor(status: string): string;
  getPriorityColor(priority: string): string;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/editor/character-details/character-details.component.ts

### Class: CharacterDetailsComponent
```typescript
class CharacterDetailsComponent {
  character: any;
  updateField: any;
  addNewCharacter: any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/editor/editor-header/editor-header.component.ts

### Class: EditorHeaderComponent
```typescript
class EditorHeaderComponent {
  activeNav: any;
  canUndo: any;
  canRedo: any;
  searchOpen: any;
  searchQuery: any;
  filteredResults: any;
  focusMode: any;
  fullScreenMode: any;
  exportMenuOpen: any;
  setActiveNav: any;
  performUndo: any;
  performRedo: any;
  toggleSearch: any;
  searchQueryChange: any;
  selectSearchResult: any;
  toggleFocusMode: any;
  toggleFullScreen: any;
  openVersionHistory: any;
  toggleExportMenu: any;
  exportNovel: any;
}
```

### Interface: SearchResult
```typescript
interface SearchResult {
  type: 'chapter' | 'character' | 'location' | 'frontMatter' | 'prologue';
  id: string;
  title: string;
  subtitle?: string;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/editor/editor-toolbar/editor-toolbar.component.ts

### Class: EditorToolbarComponent
```typescript
class EditorToolbarComponent {
  editor: any;
  openLinkModal: any;
  addImage: any;
  insertTable: any;
  addYoutube: any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/editor/location-details/location-details.component.ts

### Class: LocationDetailsComponent
```typescript
class LocationDetailsComponent {
  location: any;
  updateField: any;
  addNewLocation: any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/editor/manuscript-editor/manuscript-editor.component.ts

### Class: ManuscriptEditorComponent
```typescript
class ManuscriptEditorComponent {
  editor: any;
  activeChapterId: any;
  title: any;
  chapterStatus: any;
  chapterLastEdited: any;
  isSaving: any;
  lastSaved: any;
  titleChange: any;
  addNewChapter: any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/editor/structure-editor/structure-editor.component.ts

### Class: StructureEditorComponent
```typescript
class StructureEditorComponent {
  editor: any;
  activeFrontMatterId: any;
  activePrologueId: any;
  frontMatter: any;
  prologue: any;
  addFrontMatterItem: any;
  addPrologue: any;
  getFrontMatterTypeLabel(type: string): string;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/modals/add-modal/add-modal.component.ts

### Class: AddModalComponent
```typescript
class AddModalComponent {
  modal: any;
  inputValueChange: any;
  inputValue2Change: any;
  confirm: any;
  cancel: any;
  addInputRef: ElementRef<HTMLInputElement>;
  ngAfterViewChecked(): any;
  onInputChange(value: string): any;
  onInput2Change(value: string): any;
  onConfirm(): any;
  onCancel(): any;
  onKeydown(event: KeyboardEvent): any;
}
```

### Interface: AddModalData
```typescript
interface AddModalData {
  isOpen: boolean;
  type: 'act' | 'chapter' | 'note' | null;
  title: string;
  inputValue: string;
  inputValue2?: string;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/modals/delete-modal/delete-modal.component.ts

### Class: DeleteModalComponent
```typescript
class DeleteModalComponent {
  modal: any;
  confirm: any;
  cancel: any;
}
```

### Interface: DeleteModalData
```typescript
interface DeleteModalData {
  isOpen: boolean;
  type: 'chapter' | 'group' | 'character' | 'location' | 'note' | null;
  id: string | null;
  title: string;
  message: string;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/modals/link-modal/link-modal.component.ts

### Class: LinkModalComponent
```typescript
class LinkModalComponent {
  isOpen: any;
  linkText: any;
  linkUrl: any;
  linkTextChange: any;
  linkUrlChange: any;
  insert: any;
  cancel: any;
  onInsert(): any;
  onCancel(): any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/modals/version-history-modal/version-history-modal.component.ts

### Class: VersionHistoryModalComponent
```typescript
class VersionHistoryModalComponent {
  isOpen: any;
  versions: any;
  restore: any;
  close: any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/right-sidebar/ai-panel/ai-panel.component.ts

### Class: AiPanelComponent
```typescript
class AiPanelComponent {
  aiMessages: any;
  aiLoading: any;
  aiError: any;
  aiPrompt: any;
  aiSuggestions: any;
  showContextPreview: any;
  tokenCount: any;
  context: any;
  activeChapter: any;
  editor: any;
  aiMessagesContainer: ElementRef<HTMLDivElement>;
  sendMessage: any;
  analyzeToneAndPacing: any;
  generateSuggestions: any;
  summarizeChapter: any;
  continueWriting: any;
  applySuggestion: any;
  clearConversation: any;
  clearSuggestions: any;
  toggleContextPreview: any;
  promptChange: any;
  formatMessage(content: string): string;
  formatTime(date: Date): string;
  ngAfterViewChecked(): any;
  handleChatEnter(event: KeyboardEvent): any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/right-sidebar/manuscript-data/manuscript-data.component.ts

### Class: ManuscriptDataComponent
```typescript
class ManuscriptDataComponent {
  totalNovelWords: any;
  averageChapterLength: any;
  chaptersCompleted: any;
  totalChapters: any;
  logline: any;
  theme: any;
  wordCount: any;
  targetWordCount: any;
  goalProgress: any;
  activeChapterId: any;
  mentionedCharacters: any;
  mentionedLocations: any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/right-sidebar/notes-panel/notes-panel.component.ts

### Class: NotesPanelComponent
```typescript
class NotesPanelComponent {
  notes: any;
  addNewNote: any;
  deleteNote: any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/sidebar/chapters-list/chapters-list.component.ts

### Class: ChaptersListComponent
```typescript
class ChaptersListComponent {
  chapters: any;
  activeChapterId: any;
  bulkMode: any;
  selectedChapters: any;
  addMenuOpen: any;
  selectChapter: any;
  toggleChapter: any;
  deleteChapter: any;
  deleteGroup: any;
  toggleBulkMode: any;
  bulkDelete: any;
  toggleAddMenu: any;
  addNewActOrPart: any;
  addNewChapter: any;
  toggleChapterSelection: any;
  dragStartIndex: any;
  dragOverIndex: any;
  onDragStart(event: DragEvent, index: number, type: 'chapter' | 'group'): any;
  onDragOver(event: DragEvent, index: number): any;
  onDragEnd(): any;
  onDrop(event: DragEvent, dropIndex: number, type: 'chapter' | 'group', groupId: string): any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/sidebar/characters-list/characters-list.component.ts

### Class: CharactersListComponent
```typescript
class CharactersListComponent {
  characters: any;
  selectedCharacterId: any;
  selectCharacter: any;
  deleteCharacter: any;
  addNewCharacter: any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/sidebar/locations-list/locations-list.component.ts

### Class: LocationsListComponent
```typescript
class LocationsListComponent {
  locations: any;
  selectedLocationId: any;
  selectLocation: any;
  deleteLocation: any;
  addNewLocation: any;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/sidebar/structure-view/structure-view.component.ts

### Class: StructureViewComponent
```typescript
class StructureViewComponent {
  frontMatter: any;
  prologue: any;
  activeFrontMatterId: any;
  activePrologueId: any;
  addMenuOpen: any;
  selectFrontMatterItem: any;
  selectPrologue: any;
  deleteFrontMatterItem: any;
  deletePrologue: any;
  addFrontMatterItem: any;
  addPrologue: any;
  toggleAddMenu: any;
  getFrontMatterTypeIcon(type: string): string;
}
```

---

## File: /libs/feature-novels/src/lib/novels/novel-editor/components/sidebar/sync-status/sync-status.component.ts

### Class: SyncStatusComponent
```typescript
class SyncStatusComponent {
  wordCount: any;
  formattedTime: any;
  goalProgress: any;
  leftSidebarCollapsed: any;
  toggleSidebar: any;
}
```

---

