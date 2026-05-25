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
  currentRoute: any;
  hasSidebar: any;
  isImmersive: any;
  isFullScreen: any;
  sidebarCollapsed: any;
  subNavVisible: any;
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

## File: /apps/mobile/src/app/app.component.ts

### Class: AppComponent
```typescript
class AppComponent {
  isFullScreen: any;
  navItems: NavItem[];
  ngOnInit(): any;
}
```

---

## File: /apps/web/src/app/app.component.ts

### Class: AppComponent
```typescript
class AppComponent {
  title: any;
  updateAvailable: any;
  currentTab: any;
  hasSidebar: any;
  isImmersive: any;
  isFullScreen: any;
  sidebarCollapsed: any;
  navigationLayout: any;
  ngOnInit(): any;
  applyUpdate(): any;
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
  saveCredential(credential: Credential): Promise<void>;
  getCredentials(): Promise<Credential[]>;
  deleteCredential(id: string): Promise<void>;
  saveSubscription(subscription: Subscription): Promise<void>;
  getSubscriptions(): Promise<Subscription[]>;
  deleteSubscription(id: string): Promise<void>;
  saveLink(link: CredentialSubscriptionLink): Promise<void>;
  getLinks(): Promise<CredentialSubscriptionLink[]>;
  deleteLink(id: string): Promise<void>;
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
  createdAt?: string;
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
  folderId?: string;
  bgColor?: string;
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

### Interface: Book
```typescript
interface Book {
  id: string;
  title: string;
  icon: string;
  status: 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED';
  writingType?: WritingType;
  wordCount: number;
  targetWordCount: number;
  progress: number;
  chapters: number;
  notesCount: number;
  createdDate: string;
  lastUpdated: string;
  createdAt?: string;
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
  words: number;
  updated: string;
  icon: string;
  dueDate?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  progress?: number;
  team?: string[];
  tags?: string[];
  type?: 'SINGLE' | 'MULTI';
  linkedResources?: {
        books?: string[];
        notes?: string[];
        meetings?: string[];
        research?: string[];
        articles?: string[];
        snippets?: string[];
        bookmarks?: string[];
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

### Interface: Credential
```typescript
interface Credential {
  id: string;
  name: string;
  type: 'login' | 'api_key' | 'ssh' | 'db' | 'note';
  value: string;
  username?: string;
  url?: string;
  notes?: string;
  projectId?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  lastAccessedAt?: string;
}
```

### Interface: Subscription
```typescript
interface Subscription {
  id: string;
  name: string;
  category: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  renewalDate: string;
  status?: 'active' | 'paused' | 'cancelled';
  currency?: string;
  ownerId?: string;
  projectId?: string;
  notes?: string;
}
```

### Interface: CredentialSubscriptionLink
```typescript
interface CredentialSubscriptionLink {
  id: string;
  credentialId: string;
  subscriptionId: string;
}
```

### Interface: WorkspaceProfile
```typescript
interface WorkspaceProfile {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: string;
  lastAccessed: string;
}
```

### Interface: Bookmark
```typescript
interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  faviconUrl?: string;
  tags?: string[];
  folderId?: string;
  createdAt: string;
  lastVisited?: string;
  visitCount?: number;
  notes?: string;
  color?: string;
  isArchived?: boolean;
  isPinned?: boolean;
}
```

### Interface: StorageFile
```typescript
interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  publicUrl?: string;
  uploadedAt: string;
  collectionId?: string;
  sourceType?: 'task' | 'note' | 'research' | 'bookmark' | 'direct';
  sourceId?: string;
  description?: string;
  tags?: string[];
}
```

### Interface: BookmarkFolder
```typescript
interface BookmarkFolder {
  id: string;
  name: string;
  parentId?: string;
  icon?: string;
  color?: string;
  createdAt: string;
}
```

### Type: WritingType
```typescript
type WritingType = | 'NOVEL'
    | 'SHORT_STORY'
    | 'ARTICLE'
    | 'ESSAY'
    | 'SCRIPT'
    | 'POETRY'
    | 'BLOG_POST'
    | 'RESEARCH';
```

### Type: BinItemType
```typescript
type BinItemType = | 'daily-note'
    | 'book'
    | 'book-chapter'
    | 'book-group'
    | 'book-note'
    | 'book-character'
    | 'book-location'
    | 'task'
    | 'meeting';
```

---

## File: /libs/state/src/lib/bin.service.ts

### Class: BinService
```typescript
class BinService {
  items: any;
  addToBin(item: Omit<BinItem, 'id' | 'deletedAt'>): any;
  restore(binItemId: string): Promise<boolean>;
  canRestore(type: BinItemType): boolean;
  permanentlyDelete(binItemId: string): any;
  emptyBin(): any;
}
```

---

## File: /libs/state/src/lib/link.store.ts

### Class: LinkStore
```typescript
class LinkStore {
  links: any;
  linkCredentialToSubscription(credentialId: string, subscriptionId: string): any;
  unlink(id: string): any;
  getLinksByCredential(credentialId: string): any;
  getLinksBySubscription(subscriptionId: string): any;
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
  books: any;
  noteFolders: any;
  bookmarks: any;
  bookmarkFolders: any;
  spaces: any;
  loadNoteContent(id: string): Promise<string>;
  addTask(task: Task): any;
  updateTask(id: string, updates: Partial<Task>): any;
  deleteTask(id: string): any;
  addNote(note: Note): any;
  updateNote(id: string, updates: Partial<Note>): any;
  deleteNote(id: string): any;
  addPlanningItem(item: PlanningItem): any;
  addBook(book: Book): any;
  addSpace(space: Project): any;
  deleteSpace(id: string): any;
  updateSpace(id: string, updates: Partial<Project>): any;
  deleteBook(id: string): any;
  addBookmark(bookmark: Bookmark): any;
  updateBookmark(id: string, updates: Partial<Bookmark>): any;
  deleteBookmark(id: string): any;
  addBookmarkFolder(folder: BookmarkFolder): any;
  deleteBookmarkFolder(id: string): any;
  addActivity(text: string, type: Activity['type']): any;
  addNoteFolder(folder: { id: string; name: string; icon: string }): any;
  removeNoteFolder(id: string): any;
  updateNoteFolder(id: string, updates: Partial<{ name: string; icon: string }>): any;
}
```

---

## File: /libs/state/src/lib/subscription.store.ts

### Class: SubscriptionStore
```typescript
class SubscriptionStore {
  subscriptions: any;
  upcomingRenewals: any;
  totalMonthlyCost: any;
  totalYearlyCost: any;
  addSubscription(sub: Subscription): any;
  getSubscriptionsByProject(projectId: string): any;
  updateSubscription(id: string, changes: Partial<Subscription>): any;
  deleteSubscription(id: string): any;
}
```

---

## File: /libs/state/src/lib/vault.store.ts

### Class: VaultStore
```typescript
class VaultStore {
  credentials: any;
  addCredential(cred: Omit<Credential, 'value'> & { unencryptedValue: string }): any;
  getCredentialsByProject(projectId: string): any;
  updateCredential(id: string, changes: Partial<Credential> & { newUnencryptedValue?: string }): any;
  touchCredential(id: string): any;
  deleteCredential(id: string): any;
  decryptValue(cipher: string): Promise<string>;
}
```

---

## File: /apps/admin/src/app/layout/admin-layout.component.ts

### Class: AdminLayoutComponent
```typescript
class AdminLayoutComponent {
  navItems: NavItem[];
  userEmail: any;
  ngOnInit(): any;
  ngOnDestroy(): any;
  logout(): any;
}
```

---

## File: /apps/admin/src/app/services/admin.service.ts

### Class: AdminService
```typescript
class AdminService {
  loadAiConfig(): Promise<PlatformAiConfig | null>;
  saveAiConfig(config: Partial<PlatformAiConfig>): Promise<{ error: string | null }>;
  loadFeatureFlags(): Promise<FeatureFlag[]>;
  saveFeatureFlags(flags: FeatureFlag[]): Promise<{ error: string | null }>;
  loadUsers(): Promise<AdminUser[]>;
  updateUserRole(userId: string, role: 'admin' | 'user'): Promise<{ error: string | null }>;
  updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<{ error: string | null }>;
  loadUsageSummary(filter: 'today' | 'week' | 'month'): Promise<UsageSummary>;
  loadUsageByUser(filter: 'today' | 'week' | 'month'): Promise<UsageRow[]>;
  loadProviderBreakdown(filter: 'today' | 'week' | 'month'): Promise<{ provider: string; count: number; pct: number }[]>;
  loadDashboardStats(): Promise<{
    totalUsers: number;
    aiRequestsToday: number;
    activeFlagCount: number;
    platformProvider: string;
  }>;
  loadRecentActivity(): Promise<{ user_id: string; email: string; provider: string; model: string; created_at: string }[]>;
  logAudit(action: string, targetId: string | null, details: string): Promise<void>;
  loadAuditLog(limit: any): Promise<AuditEntry[]>;
}
```

### Interface: PlatformAiConfig
```typescript
interface PlatformAiConfig {
  provider: string;
  model_name: string;
  api_key: string;
  ai_enabled: boolean;
  updated_at?: string;
}
```

### Interface: FeatureFlag
```typescript
interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  affects: 'All Users' | 'Admins only' | 'Beta users';
  updated_at?: string;
}
```

### Interface: AdminUser
```typescript
interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  ai_usage: number;
  created_at: string;
}
```

### Interface: UsageRow
```typescript
interface UsageRow {
  user_id: string;
  email: string;
  provider: string;
  model: string;
  requests: number;
  total_chars: number;
  last_active: string;
}
```

### Interface: UsageSummary
```typescript
interface UsageSummary {
  total_requests: number;
  total_chars: number;
}
```

### Interface: AuditEntry
```typescript
interface AuditEntry {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_id: string | null;
  details: string;
  created_at: string;
}
```

---

## File: /apps/desktop/src/app/services/update.service.ts

### Class: UpdateService
```typescript
class UpdateService {
  available: any;
  version: any;
  notes: any;
  downloading: any;
  progress: any;
  error: any;
  checkForUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  dismiss(): void;
}
```

---

## File: /apps/mobile/src/app/settings/settings.component.ts

### Class: SettingsComponent
```typescript
class SettingsComponent {
  userInitial(): any;
  logout(): any;
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
  testConfig(provider: AiProvider, model: string, key: string): Promise<void>;
  sendMessage(prompt: string, context: string): Promise<string>;
  streamMessage(prompt: string, context: string): AsyncIterable<string>;
  analyzeToneAndPacing(content: string): Promise<string>;
  generateSuggestions(content: string): Promise<AiSuggestion[]>;
  summarizeContent(content: string): Promise<string>;
  continueWriting(content: string, cursorPosition: number): Promise<string>;
  improveText(selectedText: string): Promise<string>;
  expandIdea(idea: string): Promise<string>;
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
type AiProvider = 'openai' | 'anthropic' | 'ollama' | 'mock' | 'grok' | 'gemini' | 'deepseek';
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

## File: /libs/core/src/lib/services/book-content.service.ts

### Class: BookContentService
```typescript
class BookContentService {
  activeBook: any;
  store: any;
  loadBook(id: string): Promise<void>;
  getChapter(chapterId: string): Chapter | undefined;
  updateChapterContent(chapterId: string, content: string, wordCount: number): any;
  toggleGroupExpand(groupId: string): any;
  updateChapterTitle(chapterId: string, title: string): any;
  updateChapterTags(chapterId: string, tags: string[]): any;
  updateChapterSummary(chapterId: string, summary: string): any;
  addChapter(groupId: string, title: string): any;
  deleteChapter(chapterId: string): any;
  addChapterGroup(title: string): any;
  moveChapterToGroup(chapterId: string, targetGroupId: string): any;
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
  updateBookTitle(title: string): any;
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
  cloneBookContent(sourceId: string, newId: string, newTitle: string): Promise<void>;
  createAndPersistEmptyBook(id: string, title: string): Promise<void>;
}
```

### Interface: BookContent
```typescript
interface BookContent {
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

## File: /libs/core/src/lib/services/calendar-sync.service.ts

### Class: CalendarSyncService
```typescript
class CalendarSyncService {
  connections: any;
  syncing: any;
  addConnection(partial: Omit<CalendarConnection, 'id' | 'color'>): CalendarConnection;
  removeConnection(id: string): void;
  toggleEnabled(id: string): void;
  syncAll(): Promise<void>;
  syncConnection(id: string): Promise<void>;
  isSyncing(id: string): boolean;
  formatLastSync(conn: CalendarConnection): string;
}
```

### Interface: CalendarConnection
```typescript
interface CalendarConnection {
  id: string;
  provider: 'google' | 'outlook' | 'apple' | 'zoom' | 'teams' | 'custom';
  name: string;
  icsUrl: string;
  color: string;
  enabled: boolean;
  lastSync?: string;
  lastSyncCount?: number;
  error?: string;
}
```

---

## File: /libs/core/src/lib/services/file-storage.service.ts

### Class: FileStorageService
```typescript
class FileStorageService {
  files: any;
  uploading: any;
  displayUrl(fileId: string): string;
  getSignedUrl(storagePath: string, expiresIn: any): Promise<string>;
  upload(file: File, source: { type: StorageFile['sourceType']; id: string }, collectionId: string): Promise<StorageFile>;
  uploadMany(files: File[], source: { type: StorageFile['sourceType']; id: string }, collectionId: string): Promise<StorageFile[]>;
  delete(fileId: string): Promise<void>;
  isImage(file: StorageFile): boolean;
  formatSize(bytes: number): string;
  fileIcon(mimeType: string): string;
}
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
  addMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Meeting;
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
  externalId?: string;
  externalSource?: 'google' | 'outlook' | 'apple' | 'zoom' | 'teams' | 'custom';
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
type MeetingViewMode = 'list' | 'calendar' | 'kanban' | 'table';
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

## File: /libs/core/src/lib/services/pouchdb-data.service.ts

### Class: PouchDbDataService
```typescript
class PouchDbDataService {
  getAll(collection: string): Promise<T[]>;
  upsert(collection: string, item: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  importData(data: any): Promise<void>;
  saveCredential(credential: Credential): Promise<void>;
  getCredentials(): Promise<Credential[]>;
  deleteCredential(id: string): Promise<void>;
  saveSubscription(subscription: Subscription): Promise<void>;
  getSubscriptions(): Promise<Subscription[]>;
  deleteSubscription(id: string): Promise<void>;
  saveLink(link: CredentialSubscriptionLink): Promise<void>;
  getLinks(): Promise<CredentialSubscriptionLink[]>;
  deleteLink(id: string): Promise<void>;
}
```

---

## File: /libs/core/src/lib/services/research.service.ts

### Class: ResearchService
```typescript
class ResearchService {
  collections: any;
  sources: any;
  summaries: any;
  addCollection(collection: Omit<ResearchCollection, 'id' | 'createdDate' | 'lastModified'>): any;
  updateCollection(id: string, updates: Partial<ResearchCollection>): any;
  deleteCollection(id: string): any;
  addSource(source: Omit<ResearchSource, 'id' | 'createdDate'>): any;
  updateSource(id: string, updates: Partial<ResearchSource>): any;
  deleteSource(id: string): any;
  getSourcesByCollection(collectionId: string): any;
  addSummary(summary: Omit<ResearchSummary, 'id' | 'createdDate' | 'lastModified'>): any;
  updateSummary(id: string, updates: Partial<ResearchSummary>): any;
  deleteSummary(id: string): any;
  getSummariesByCollection(collectionId: string): any;
}
```

### Interface: ResearchCollection
```typescript
interface ResearchCollection {
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
  collectionId?: string;
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
  linkedTaskIds?: string[];
}
```

### Interface: ResearchSummary
```typescript
interface ResearchSummary {
  id: string;
  collectionId: string;
  title: string;
  content: string;
  sourceIds: string[];
  fileIds?: string[];
  tags: string[];
  createdDate: string;
  lastModified: string;
}
```

---

## File: /libs/core/src/lib/services/semantic-search.service.ts

### Class: SemanticSearchService
```typescript
class SemanticSearchService {
  search(query: string, k: any): Promise<SemanticResult[]>;
}
```

### Interface: SemanticResult
```typescript
interface SemanticResult {
  id: string;
  type: 'note' | 'task' | 'book' | 'bookmark';
  title: string;
  preview: string;
  icon: string;
  route: string;
  tags?: string[];
  badge?: string;
  date?: string;
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

## File: /libs/core/src/lib/services/sqlite-data.service.ts

### Class: SqliteDataService
```typescript
class SqliteDataService {
  getAll(collection: string): Promise<T[]>;
  upsert(collection: string, item: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  importData(data: any): Promise<void>;
  saveCredential(credential: any): Promise<void>;
  getCredentials(): Promise<any[]>;
  deleteCredential(id: string): Promise<void>;
  saveSubscription(subscription: any): Promise<void>;
  getSubscriptions(): Promise<any[]>;
  deleteSubscription(id: string): Promise<void>;
  saveLink(link: any): Promise<void>;
  getLinks(): Promise<any[]>;
  deleteLink(id: string): Promise<void>;
}
```

---

## File: /libs/core/src/lib/services/sqlite.service.ts

### Class: SqliteService
```typescript
class SqliteService {
  getDb(): Promise<Database>;
  getAppMeta(key: string): Promise<string | null>;
  setAppMeta(key: string, value: string): Promise<void>;
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
  removePlanningItem(id: string): Promise<void>;
  upsertActivity(act: ActivityDoc): Promise<void>;
  activities$(): Observable<ActivityDoc[]>;
  getAllActivities(): Promise<ActivityDoc[]>;
  removeActivity(id: string): Promise<void>;
  upsertBook(book: BookDoc): Promise<void>;
  books$(): Observable<BookDoc[]>;
  getAllBooks(): Promise<BookDoc[]>;
  removeBook(id: string): Promise<void>;
  getBookContent(id: string): Promise<string | null>;
  setBookContent(id: string, data: string): Promise<void>;
  removeBookContent(id: string): Promise<void>;
  upsertBinItem(item: BinItemDoc): Promise<void>;
  removeBinItem(id: string): Promise<void>;
  clearBin(): Promise<void>;
  binItems$(): Observable<BinItemDoc[]>;
  getAllBinItems(): Promise<BinItemDoc[]>;
  upsertMeeting(doc: MeetingDoc): Promise<void>;
  getAllMeetings(): Promise<MeetingDoc[]>;
  removeMeeting(id: string): Promise<void>;
  getAllArticles(): Promise<ArticleDoc[]>;
  upsertArticle(article: ArticleDoc): Promise<void>;
  removeArticle(id: string): Promise<void>;
  upsertResearchCollection(doc: ResearchCollectionDoc): Promise<void>;
  getAllResearchCollections(): Promise<ResearchCollectionDoc[]>;
  removeResearchCollection(id: string): Promise<void>;
  upsertResearchSource(doc: ResearchSourceDoc): Promise<void>;
  getAllResearchSources(): Promise<ResearchSourceDoc[]>;
  removeResearchSource(id: string): Promise<void>;
  upsertResearchSummary(doc: ResearchSummaryDoc): Promise<void>;
  getAllResearchSummaries(): Promise<ResearchSummaryDoc[]>;
  removeResearchSummary(id: string): Promise<void>;
  getAllProjects(): Promise<ProjectDoc[]>;
  upsertProject(project: ProjectDoc): Promise<void>;
  removeProject(id: string): Promise<void>;
  projects$(): Observable<ProjectDoc[]>;
  getAllCredentials(): Promise<CredentialDoc[]>;
  upsertCredential(item: CredentialDoc): Promise<void>;
  removeCredential(id: string): Promise<void>;
  getAllSubscriptions(): Promise<SubscriptionDoc[]>;
  upsertSubscription(item: SubscriptionDoc): Promise<void>;
  removeSubscription(id: string): Promise<void>;
  getAllLinks(): Promise<CredentialSubscriptionLinkDoc[]>;
  upsertLink(item: CredentialSubscriptionLinkDoc): Promise<void>;
  removeLink(id: string): Promise<void>;
  getAllNoteFolders(): Promise<NoteFolderDoc[]>;
  upsertNoteFolder(item: NoteFolderDoc): Promise<void>;
  removeNoteFolder(id: string): Promise<void>;
  getAllBookmarks(): Promise<BookmarkDoc[]>;
  upsertBookmark(item: BookmarkDoc): Promise<void>;
  removeBookmark(id: string): Promise<void>;
  getAllBookmarkFolders(): Promise<BookmarkFolderDoc[]>;
  upsertBookmarkFolder(item: BookmarkFolderDoc): Promise<void>;
  removeBookmarkFolder(id: string): Promise<void>;
  exportAllData(): Promise<any>;
}
```

### Interface: BookContentDoc
```typescript
interface BookContentDoc {
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

### Type: BookDoc
```typescript
type BookDoc = Book;
```

### Type: BinItemDoc
```typescript
type BinItemDoc = BinItem;
```

### Type: MeetingDoc
```typescript
type MeetingDoc = Meeting;
```

### Type: ArticleDoc
```typescript
type ArticleDoc = Article;
```

### Type: ResearchCollectionDoc
```typescript
type ResearchCollectionDoc = ResearchCollection;
```

### Type: ResearchSourceDoc
```typescript
type ResearchSourceDoc = ResearchSource;
```

### Type: ResearchSummaryDoc
```typescript
type ResearchSummaryDoc = ResearchSummary;
```

### Type: ProjectDoc
```typescript
type ProjectDoc = Project;
```

### Type: CredentialDoc
```typescript
type CredentialDoc = Credential;
```

### Type: SubscriptionDoc
```typescript
type SubscriptionDoc = Subscription;
```

### Type: CredentialSubscriptionLinkDoc
```typescript
type CredentialSubscriptionLinkDoc = CredentialSubscriptionLink;
```

### Type: NoteFolderDoc
```typescript
type NoteFolderDoc = { id: string; name: string; icon: string };
```

### Type: BookmarkDoc
```typescript
type BookmarkDoc = Bookmark;
```

### Type: BookmarkFolderDoc
```typescript
type BookmarkFolderDoc = BookmarkFolder;
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

## File: /libs/core/src/lib/services/sync.service.ts

### Class: SyncService
```typescript
class SyncService {
  isSyncing: any;
  lastSyncedAt: any;
  push(collection: string, profileId: string, item: any): Promise<void>;
  pushDelete(collection: string, profileId: string, id: string): Promise<void>;
  pull(): Promise<SyncRecord[]>;
  resetLastSync(): void;
  subscribeRealtime(onRecord: (record: SyncRecord) => void): () => void;
}
```

### Interface: SyncRecord
```typescript
interface SyncRecord {
  id: string;
  user_id: string;
  profile_id: string;
  collection: string;
  data: any;
  deleted: boolean;
  updated_at: string;
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

## File: /libs/core/src/lib/services/vault-key.service.ts

### Class: VaultKeyService
```typescript
class VaultKeyService {
  getOrCreateKey(userId: string): Promise<CryptoKey>;
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

## File: /libs/core/src/lib/services/voice.service.ts

### Class: VoiceService
```typescript
class VoiceService {
  isVoiceActive: any;
  toggleVoice(): any;
}
```

---

## File: /libs/core/src/lib/services/workspace-profile.service.ts

### Class: WorkspaceProfileService
```typescript
class WorkspaceProfileService {
  profiles: any;
  activeProfileId: any;
  activeProfile: any;
  addProfile(name: string, color: string): any;
  addProfileWithId(id: string, name: string, color: string, icon: string): any;
  switchProfile(id: string): any;
  removeProfile(id: string): any;
  updateProfile(id: string, updates: Partial<WorkspaceProfile>): any;
}
```

---

## File: /libs/core/src/lib/utils/encryption.util.ts

### Class: EncryptionUtil
```typescript
class EncryptionUtil {
  getOrCreateKey(userId: string): Promise<CryptoKey>;
  encrypt(text: string, userId: string): Promise<string>;
  encryptWithKey(text: string, key: CryptoKey): Promise<string>;
  decrypt(cipher: string, userId: string): Promise<string>;
  decryptWithKey(cipher: string, key: CryptoKey): Promise<string>;
  legacyDecrypt(cipher: string): string;
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

## File: /libs/feature-bookmarks/src/lib/bookmarks/bookmarks.component.ts

### Class: BookmarksComponent
```typescript
class BookmarksComponent {
  store: any;
  selectedView: any;
  viewMode: any;
  sortBy: any;
  sortAsc: any;
  searchQuery: any;
  selectedFolderId: any;
  selectedTags: any;
  showAddModal: any;
  addUrl: any;
  addTitle: any;
  addDescription: any;
  addNotes: any;
  addTagInput: any;
  addTags: any;
  addFolderId: any;
  addColor: any;
  showEditModal: any;
  editingBookmark: any;
  editUrl: any;
  editTitle: any;
  editDescription: any;
  editNotes: any;
  editTagInput: any;
  editTags: any;
  editFolderId: any;
  editColor: any;
  showAddFolderModal: any;
  newFolderName: any;
  newFolderIcon: any;
  newFolderColor: any;
  showDeleteConfirm: any;
  deletingBookmarkId: any;
  showShortcutsHelp: any;
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  aiSuggestions: any;
  allTags: any;
  activeNavId: any;
  sidebarItems: any;
  filteredBookmarks: any;
  folderTree: any;
  bookmarkCountByFolder: any;
  tableColumns: EnvTableColumn[];
  tableActions: EnvTableAction[];
  tableRows: any;
  accentColors: any;
  folderIcons: any;
  onNavItemClick(id: string): any;
  ngOnInit(): any;
  ngOnDestroy(): any;
  handleGlobalKey(e: KeyboardEvent): any;
  openAddModal(): any;
  onAddUrlBlur(): any;
  addTagFromInput(): any;
  onAddTagKeydown(e: KeyboardEvent): any;
  removeAddTag(tag: string): any;
  submitAddBookmark(): any;
  openEditModal(bookmark: Bookmark): any;
  editTagFromInput(): any;
  onEditTagKeydown(e: KeyboardEvent): any;
  removeEditTag(tag: string): any;
  submitEditBookmark(): any;
  requestDelete(id: string): any;
  confirmDelete(): any;
  togglePin(bookmark: Bookmark): any;
  toggleArchive(bookmark: Bookmark): any;
  openBookmark(bookmark: Bookmark): any;
  toggleTagFilter(tag: string): any;
  clearFilters(): any;
  openAddFolderModal(): any;
  submitAddFolder(): any;
  deleteFolder(id: string): any;
  getFaviconUrl(url: string): string;
  getDomain(url: string): string;
  formatDate(iso: string): string;
  formatRelativeDate(iso: string): string;
  getBookmarkCardColor(bookmark: Bookmark): string;
  folderName(folderId: string): string;
  toggleSortAsc(): any;
  setSortBy(col: SortBy): any;
  currentViewLabel(): string;
  handleTableAction(event: EnvTableActionEvent): any;
  handleTableSort(event: EnvTableSortEvent): any;
  trackById(_: number, item: Bookmark): any;
  trackByFolderId(_: number, f: BookmarkFolder): any;
  toggleAssistant(): any;
  sendAiMessage(text: string): any;
  clearAiChat(): any;
  closeAllModals(): any;
}
```

---

## File: /libs/feature-daily-notes/src/lib/daily-notes/daily-notes.component.ts

### Class: DailyNotesComponent
```typescript
class DailyNotesComponent {
  editor: Editor;
  aiGenerating: any;
  notes: any;
  wordCount: any;
  characterCount: any;
  activeModal: any;
  modalInputValue: any;
  modalInputPlaceholder: any;
  modalTitle: any;
  tempNoteId: any;
  tempFolderId: any;
  selectedEntryId: any;
  searchQuery: any;
  selectedFilter: any;
  selectedTag: any;
  showColorPicker: any;
  isFullWidth: any;
  showTagInput: any;
  tagInputValue: any;
  renamingFolderId: any;
  renameInputValue: any;
  bgColors: any;
  openNotes: any;
  noteGroups: any;
  allTags: any;
  showDropdown: any;
  showFormatMenu: any;
  showInfoMenu: any;
  showMediaMenu: any;
  activeFolderMenuId: any;
  pinnedCount: any;
  taggedCount: any;
  noteBgClass: any;
  dragOverFolderId: any;
  draggingNoteId: any;
  displayModalTitle: any;
  filteredNotes: any;
  notesPerFolder: any;
  allExpanded: any;
  selectedNote: any;
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  aiSuggestions: any;
  getNotesForFolder(folderId: string): Note[];
  getBucketedNotes(notes: Note[]): { label: string, notes: Note[] }[];
  formatTime(id: string, lastEdited: string): string;
  getPreviewText(preview: string): string;
  handleEscape(event: Event): any;
  ngOnInit(): any;
  ngOnDestroy(): void;
  updateNoteContent(content: string, preview: string): any;
  handleNewNote(): any;
  moveNoteToFolder(noteId: string, targetFolderId: string): any;
  onNoteDragStart(noteId: string, event: DragEvent): any;
  onNoteDragEnd(): any;
  onFolderDragOver(folderId: string, event: DragEvent): any;
  onFolderDragLeave(event: DragEvent): any;
  onFolderDrop(folderId: string, event: DragEvent): any;
  onListDragOver(event: DragEvent): any;
  onListDragLeave(event: DragEvent): any;
  onListDrop(event: DragEvent): any;
  selectNote(id: string): any;
  toggleGroup(groupId: string): any;
  clearSearch(): any;
  toggleFolderMenu(folderId: string): any;
  setFilter(filter: string): any;
  selectTag(tag: string): any;
  isPinned(note: Note): boolean;
  togglePin(note: Note): any;
  getNoteTags(note: Note): string[];
  setNoteBgColor(color: string): any;
  submitTagInput(): any;
  startRenameFolder(folderId: string, currentName: string, event: Event): any;
  confirmRenameFolder(): any;
  toggleDropdown(): any;
  toggleInfoMenu(): any;
  toggleFormatMenu(): any;
  toggleMediaMenu(): any;
  setFormat(type: 'paragraph' | 'h1' | 'h2' | 'h3'): any;
  duplicateNote(note: Note): any;
  handleNewFolder(): any;
  confirmNewFolder(): any;
  toggleExpandAll(): any;
  closeNoteTab(noteId: string): any;
  getNoteById(id: string): Note | undefined;
  handleKeyboardShortcuts(event: KeyboardEvent): any;
  onDocumentClick(event: MouseEvent): any;
  updateNoteTitle(title: string): any;
  checkAiTitleCommand(title: string): any;
  deleteCurrentNote(): any;
  requestDeleteNote(noteId: string): any;
  confirmDeleteNote(): any;
  requestDeleteFolder(folderId: string, event: Event): any;
  confirmDeleteFolder(): any;
  addTag(tag: string): any;
  removeTag(tag: string): any;
  setLink(): any;
  confirmSetLink(): any;
  exportNote(): any;
  addImage(): any;
  addYoutube(): any;
  confirmAddYoutube(): any;
  insertTable(): any;
  confirmAddImage(): any;
  downloadExport(format: 'pdf' | 'md' | 'html'): any;
  closeModal(): any;
  toggleAssistant(): any;
  sendAiMessage(text: string): any;
  clearAiChat(): any;
}
```

---

## File: /libs/feature-novels/src/lib/write/write.component.ts

### Class: WriteComponent
```typescript
class WriteComponent {
  store: any;
  viewMode: any;
  selectedType: any;
  statusFilter: any;
  sortBy: any;
  searchQuery: any;
  sortDropdownOpen: any;
  showAddModal: any;
  addModalSubmitting: any;
  newBook: any;
  showDeleteModal: any;
  bookToDelete: any;
  bookMenuOpen: any;
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  aiSuggestions: any;
  tableColumns: EnvTableColumn[];
  tableActions: EnvTableAction[];
  writingTypes: { id: WritingType; label: string; defaultWords: number; defaultIcon: string }[];
  allStatusItems: any;
  bookIcons: any;
  allTypeStats: any;
  statusCounts: any;
  hasActiveFilters: any;
  totalWords: any;
  activeDrafts: any;
  avgCompletion: any;
  filteredBooks: any;
  tableRows: any;
  getTypeMeta(type: string): any;
  getStatusMeta(status: string): any;
  readingTime(wordCount: number): string;
  getWritingTypeLabel(type: string): string;
  getProgressColor(status: string): string;
  formatDate(iso: string): string;
  clearFilters(): any;
  selectType(type: WritingType | ''): any;
  selectStatus(status: 'ALL' | 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED'): any;
  toggleSortDropdown(): any;
  selectSort(sort: 'UPDATED' | 'CREATED' | 'TITLE' | 'PROGRESS'): any;
  getSortLabel(): string;
  handleTableAction(event: any): any;
  handleTableSort(event: any): any;
  openBook(id: string): any;
  toggleBookMenu(bookId: string, e: Event): any;
  closeBookMenu(): any;
  duplicateBook(book: Book, e: Event): any;
  openDeleteModal(book: Book, e: Event): any;
  cancelDeleteBook(): any;
  confirmDeleteBook(): any;
  openAddModal(): any;
  closeAddModal(): any;
  updateNewBook(key: 'title' | 'writingType' | 'status' | 'genre' | 'targetWordCount' | 'icon', value: string | number): any;
  addBook(): any;
  toggleAssistant(): any;
  clearAiChat(): any;
  sendAiMessage(text: string): any;
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
  selectedTaskId: any;
  selectedTaskForDetails: any;
  editingTaskDetails: any;
  editedTaskTitle: any;
  editedTaskDescription: any;
  editedTaskPriority: any;
  editedTaskDue: any;
  editedTaskList: any;
  editedTaskLabels: any;
  editedTaskDueTime: any;
  editedTaskReminders: any;
  editedTaskRecurring: any;
  editedTaskRecurringPattern: any;
  detailsLabelInput: any;
  newSubtaskTitle: any;
  editingSubtaskId: any;
  editingSubtaskTitle: any;
  showReminderPicker: any;
  showNewTaskReminderPicker: any;
  pomodoroActive: any;
  pomodoroTime: any;
  pomodoroTask: any;
  showShortcutsHelp: any;
  timelineViewDate: any;
  timelineZoom: any;
  selectedTasks: any;
  bulkActionMode: any;
  collapsedSubtasks: any;
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
  newTaskStatus: any;
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
  newSubtaskPriority: any;
  newTaskShowAdvanced: any;
  detailsShowAdvanced: any;
  newTaskDependencies: any;
  newTaskDependencyInput: any;
  showDependencySearch: any;
  newTaskHours: any;
  newTaskStartDate: any;
  newTaskRecurringInterval: any;
  newTaskRecurringEndDate: any;
  newTaskTemplateOpen: any;
  showDatePicker: any;
  datePickerDate: any;
  datePickerContext: any;
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
  bulkDeleteModalOpen: any;
  sidebarItems: any;
  filtersActive: any;
  viewTitle: any;
  viewSubtitle: any;
  labelSuggestions: any;
  dependencySuggestions: any;
  nextOccurrences: any;
  metricFilter: any;
  currentDate: any;
  selectedCalendarDay: any;
  todayGroupExpanded: any;
  upcomingGroupExpanded: any;
  noDueDateGroupExpanded: any;
  todayTasksCount: any;
  completedTasksCount: any;
  activeTasksCount: any;
  priorityTasksCount: any;
  selectedDayLabel: any;
  selectedDayTasks: any;
  selectedDayTotal: any;
  selectedDayCompleted: any;
  selectedDayActive: any;
  selectedDayToday: any;
  selectedDayPriority: any;
  calendarDaySubtasks: any;
  todaySubtasks: any;
  upcomingSubtasks: any;
  inboxTasks: any;
  viewTasks: any;
  filteredTasks: any;
  flatListItems: any;
  allVisibleTasksCompleted: any;
  calendarMonth: any;
  calendarDays: any;
  todayTasks: any;
  upcomingTasks: any;
  noDueDateTasks: any;
  activeTasksCountSidebar: any;
  datePickerPosition: any;
  folderDropdownPosition: any;
  datePickerDays: any;
  datePickerMonth: any;
  TASK_TEMPLATES: any;
  REMINDER_PRESETS: any;
  pomodoroInterval: any;
  allLabels: any;
  visibleTasks: any;
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  showDetailsAi: any;
  detailsAiLoading: any;
  detailsAiMessages: any;
  detailsAiInput: any;
  detailsAiSuggestions: any;
  aiSuggestions: any;
  toggleSubtasksCollapse(taskId: string, event: Event): any;
  isSubtasksCollapsed(taskId: string): boolean;
  getFolderTaskCount(folderName: string): number;
  selectFolderInSidebar(folderName: string): any;
  createFolderInSidebar(): any;
  openNewTaskDialog(): any;
  closeNewTaskDialog(force: any): any;
  setNewTaskPriority(priority: Task['priority']): any;
  toggleNewTaskTodayDue(): any;
  setQuickAddMode(mode: 'do-now' | 'do-later'): any;
  toggleNewTaskReminder(): any;
  addNewTaskReminderPreset(value: string): any;
  removeNewTaskReminderPreset(value: string): any;
  addReminderTime(): any;
  removeReminderTime(index: number): any;
  snoozeReminder(index: number, minutes: number): any;
  addNewTaskLabel(label: string): any;
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
  addNewTaskDependency(taskId: string): any;
  removeNewTaskDependency(taskId: string): any;
  getDependencyTitle(taskId: string): string;
  hideDependencySearch(): any;
  onSidebarActiveChange(id: string): any;
  cycleTaskPriority(task: Task, event: Event): any;
  navigateMonth(direction: 'prev' | 'next'): any;
  onCalendarDayClick(day: { day: number; isCurrentMonth: boolean; isToday: boolean; isActive: boolean; isSelected?: boolean }): any;
  toggleDatePicker(event: Event, context: 'new' | 'details'): any;
  selectDate(day: number, isCurrentMonth: boolean): any;
  selectQuickDate(option: 'today' | 'tomorrow' | 'next-week'): any;
  clearTaskDue(): any;
  updateDetailsTime(time: string): any;
  updateDueTime(time: string): any;
  navigateDatePickerMonth(direction: 'prev' | 'next'): any;
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
  jumpToToday(): any;
  onMetricClick(metric: 'today' | 'completed' | 'active' | 'priority'): any;
  hasIncompleteSubtasks(task: Task): boolean;
  toggleTaskStatus(task: Task): any;
  onQuickComplete(task: Task): any;
  deleteTask(task: Task): any;
  confirmDeleteTask(): any;
  toggleAllVisibleTasksStatus(): any;
  toggleTaskGroup(group: 'today' | 'upcoming' | 'noDueDate'): any;
  isGroupExpanded(group: 'today' | 'upcoming' | 'noDueDate'): boolean;
  extractTime(dueString: string | undefined): string;
  getCompletedSubtasks(task: Task): number;
  getDependencyTitles(task: Task): string[];
  isTaskBlocked(task: Task): boolean;
  addSubtask(parentTask: Task, subtaskTitle: string): any;
  startEditSubtask(subtask: Task): any;
  saveEditSubtask(parentTask: Task, subtask: Task): any;
  deleteSubtask(parentTask: Task, subtaskId: string): any;
  focusTask(task: Task): any;
  exitFocusMode(): any;
  openTaskDetails(task: Task): any;
  closeTaskDetails(): any;
  toggleEditTaskDetails(): any;
  addDetailsReminder(value: string): any;
  removeDetailsReminder(value: string): any;
  saveTaskDetails(): any;
  deleteTaskFromDetails(): any;
  completeTaskFromDetails(): any;
  startPomodoroFromDetails(): any;
  addLabelToEdit(event: Event): any;
  removeLabelFromEdit(label: string): any;
  toggleSubtaskStatus(parentTask: Task, subtask: Task): any;
  toggleCalendarSubtaskStatus(subtask: Task, event: Event): any;
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
  onNewTaskTitleBlur(): any;
  applyTemplate(id: string): any;
  scheduleRemindersForTask(task: Task): any;
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
  isOverdue(task: { due?: string; status?: string }): boolean;
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
  confirmBulkDelete(): any;
  cancelBulkDelete(): any;
  bulkChangePriority(priority: Task['priority']): any;
  onScroll(event: Event): any;
  toggleTheme(): any;
  setFontSize(size: 'small' | 'medium' | 'large'): any;
  renderMarkdown(text: string): string;
  getTaskById(id: string): Task | undefined;
  getAvailableDependencyTasks(excludeId: string): Task[];
  addDependency(taskId: string): any;
  removeDependency(taskId: string): any;
  toggleAssistant(): any;
  sendAiMessage(text: string): any;
  clearAiChat(): any;
  sendDetailsAiMessage(text: string): any;
  clearDetailsAiChat(): any;
}
```

---

## File: /libs/feature-vault/src/lib/vault/vault.component.ts

### Class: VaultComponent
```typescript
class VaultComponent {
  vaultStore: any;
  typeOptions: any;
  searchQuery: any;
  selectedType: any;
  selectedScope: any;
  sortCol: any;
  sortDir: any;
  formMode: any;
  newCredName: any;
  newCredType: any;
  newCredUsername: any;
  newCredValue: any;
  newCredUrl: any;
  newCredNotes: any;
  newProjectId: any;
  editingId: any;
  editName: any;
  editType: any;
  editUsername: any;
  editValue: any;
  editUrl: any;
  editNotes: any;
  editProjectId: any;
  visibleCreds: any;
  decryptedSecrets: any;
  copiedId: any;
  deleteConfirmId: any;
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  aiSuggestions: any;
  activeType: any;
  usernameLabel: any;
  valueLabel: any;
  urlLabel: any;
  allTypeStats: any;
  sidebarNavItems: any;
  countByScope: any;
  hasActiveFilters: any;
  filteredCredentials: any;
  tableColumns: EnvTableColumn[];
  tableActions: EnvTableAction[];
  tableRows: any;
  onNavItemClick(id: string): any;
  handleTableAction(event: EnvTableActionEvent): any;
  handleTableSort(event: EnvTableSortEvent): any;
  setSort(col: 'name' | 'type' | 'createdAt'): any;
  clearFilters(): any;
  openAddForm(): any;
  openEditForm(cred: Credential): any;
  closeForm(): any;
  setFormType(type: Credential['type']): any;
  addCredential(): any;
  saveEdit(): any;
  confirmDelete(id: string): any;
  toggleCredVisibility(id: string): any;
  copyCred(id: string, cipher: string): any;
  toggleAssistant(): any;
  clearAiChat(): any;
  sendAiMessage(text: string): any;
  getTypeMeta(type: string): any;
  formatDate(iso: string): string;
}
```

---

## File: /libs/feature-vendor/src/lib/vendor/vendor.component.ts

### Class: VendorComponent
```typescript
class VendorComponent {
  subscriptionStore: any;
  categoryOptions: any;
  currencies: any;
  vendorNames: any;
  searchQuery: any;
  selectedStatus: any;
  selectedCycle: any;
  selectedCategory: any;
  sortCol: any;
  sortDir: any;
  formMode: any;
  editingId: any;
  formName: any;
  formCategory: any;
  formProjectId: any;
  formPrice: any;
  formCurrency: any;
  formCycle: any;
  formRenewal: any;
  formStatus: any;
  formNotes: any;
  showAdvanced: any;
  presetApplied: any;
  showVendorDropdown: any;
  vendorHighlightIdx: any;
  POPULAR_KEYS: any;
  vendorSuggestions: any;
  deleteConfirmId: any;
  showImportModal: any;
  importText: any;
  viewingSub: any;
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  aiSuggestions: any;
  canSave: any;
  activeCount: any;
  pausedCount: any;
  cancelledCount: any;
  countByCategory: any;
  hasActiveFilters: any;
  defaultCurrency: any;
  upcomingBanner: any;
  importPreviewCount: any;
  filteredSubs: any;
  tableColumns: EnvTableColumn[];
  tableActions: EnvTableAction[];
  tableRows: any;
  handleTableAction(event: EnvTableActionEvent): any;
  handleTableSort(event: EnvTableSortEvent): any;
  toggleStatusFilter(status: string): any;
  toggleCycleFilter(cycle: 'monthly' | 'yearly'): any;
  toggleCategoryFilter(cat: string): any;
  clearFilters(): any;
  setSort(col: 'name' | 'price' | 'renewalDate'): any;
  openAddForm(): any;
  openEditForm(sub: Subscription): any;
  closeForm(): any;
  saveForm(): any;
  saveAndAddAnother(): any;
  doDelete(id: string): any;
  cycleStatus(sub: Subscription): any;
  onNameChange(name: string): any;
  selectVendor(v: { key: string; displayName: string; category: string; billingCycle: 'monthly' | 'yearly'; currency: string }): any;
  onVendorBlur(): any;
  onVendorKeydown(e: KeyboardEvent): any;
  categoryIcon(cat: string): string;
  setCycle(cycle: 'monthly' | 'yearly'): any;
  rotateCurrency(): any;
  addRenewalOffset(months: number): any;
  toggleAdvanced(): any;
  parseAndImport(): any;
  daysUntil(dateStr: string): number | null;
  formatDate(iso: string): string;
  avatarBg(name: string): string;
  statusMeta(status: string | undefined | null): { label: string; color: string; bg: string };
  monthlyCost(sub: Subscription): string;
  yearlyCost(sub: Subscription): string;
  openDetails(sub: Subscription): any;
  closeDetails(): any;
  editFromDetails(sub: Subscription): any;
  currencySymbol(currency: string | undefined): string;
  toggleAssistant(): any;
  clearAiChat(): any;
  sendAiMessage(text: string): any;
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
  aiService: any;
  meetingsService: any;
  researchService: any;
  inputText: any;
  listening: any;
  liveTranscript: any;
  confidence: any;
  isProcessing: any;
  lastCreated: any;
  attachments: any;
  cpuUsage: any;
  latency: any;
  systemTime: any;
  sidebarError: any;
  conversationHistory: any;
  conversationState: any;
  partialData: any;
  pendingIntent: any;
  pendingPlan: any;
  examples: { label: string; icon: string; text: string }[];
  isInConversation: any;
  inputPlaceholder: any;
  overdueTasks: any;
  dueTodayTasks: any;
  nextMeeting: any;
  meetingCountdown: any;
  linkedEntities: any;
  userName: any;
  sidebarTasksCompleted: any;
  sidebarTasksDashOffset: any;
  sidebarActivityItems: any;
  handleKeyboard(event: KeyboardEvent): any;
  toggleVoice(): any;
  executeCommand(): any;
  clearConversation(): any;
  getGreeting(): string;
  navigateToCreated(): any;
  setExampleText(text: string): any;
  toggleSidebarTask(task: Task, event: Event): any;
  navigateSidebarItem(item: SidebarActivityItem, event: Event): any;
  addSubtask(task: Task, event: Event): any;
  clearCommand(): any;
  triggerFileUpload(): any;
  removeAttachment(index: number): any;
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

## File: /libs/ui/src/lib/ai-assistant-panel/ai-assistant-panel.component.ts

### Class: AiAssistantPanelComponent
```typescript
class AiAssistantPanelComponent {
  title: any;
  placeholder: any;
  suggestions: any;
  messages: any;
  loading: any;
  send: any;
  cleared: any;
  closed: any;
  inputText: any;
  onSend(): any;
  onSuggestionClick(text: string): any;
  onKeydown(e: KeyboardEvent): any;
}
```

### Interface: AiPanelMessage
```typescript
interface AiPanelMessage {
  role: 'user' | 'assistant';
  text: string;
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

## File: /libs/ui/src/lib/confirm-dialog/confirm-dialog.component.ts

### Class: ConfirmDialogComponent
```typescript
class ConfirmDialogComponent {
  isOpen: any;
  title: any;
  icon: any;
  variant: 'danger' | 'success';
  confirmLabel: any;
  cancelLabel: any;
  confirmed: any;
  cancelled: any;
}
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
  ctaLabel: any;
  ctaIcon: any;
  ctaClicked: any;
}
```

---

## File: /libs/ui/src/lib/feature-sidebar/feature-sidebar.component.ts

### Class: FeatureSidebarComponent
```typescript
class FeatureSidebarComponent {
  title: any;
  subtitle: any;
  navItems: FeatureSidebarNavItem[];
  activeNavId: any;
  navItemClick: any;
}
```

### Interface: FeatureSidebarNavItem
```typescript
interface FeatureSidebarNavItem {
  id: string;
  label: string;
  icon?: string;
  iconColor?: string;
  dotColor?: string;
  count?: number;
}
```

---

## File: /libs/ui/src/lib/floating-ai-button/floating-ai-button.component.ts

### Class: FloatingAiButtonComponent
```typescript
class FloatingAiButtonComponent {
  isOpen: any;
  prompt: any;
  messages: any;
  isLoading: any;
  toggle(): any;
  close(): any;
  send(): any;
  onKeydown(event: KeyboardEvent): any;
}
```

---

## File: /libs/ui/src/lib/icon-button/icon-button.component.ts

### Class: IconButtonComponent
```typescript
class IconButtonComponent {
  icon: any;
  variant: IconButtonVariant;
  size: 20 | 24 | 28 | 32 | 34 | 36;
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
type IconButtonVariant = 'primary' | 'ghost' | 'danger' | 'borderless';
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

## File: /libs/ui/src/lib/keyboard-shortcuts/keyboard-shortcuts.component.ts

### Class: KeyboardShortcutsComponent
```typescript
class KeyboardShortcutsComponent {
  isOpen: any;
  groups: ShortcutGroup[];
  onKey(event: KeyboardEvent): any;
  toggle(): any;
  open(): any;
  close(): any;
}
```

---

## File: /libs/ui/src/lib/keyboard-shortcuts/keyboard-shortcuts.service.ts

### Class: KeyboardShortcutsService
```typescript
class KeyboardShortcutsService {
  isOpen: any;
  open(): any;
  close(): any;
  toggle(): any;
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
  clearConfirm: any;
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
  doClearAll(): any;
  clearRead(): any;
  handleNotificationClick(notification: Notification): any;
  handleAction(notification: Notification, event: Event): any;
  getDefaultIcon(type: NotificationType): string;
  getRelativeTime(date: Date): string;
  handleEscape(event: Event): any;
}
```

---

## File: /libs/ui/src/lib/onboarding/onboarding.component.ts

### Class: OnboardingComponent
```typescript
class OnboardingComponent {
  isOpen: any;
  step: any;
  totalSteps: any;
  selectedUseCase: any;
  selectedTheme: any;
  selectedAiProvider: any;
  useCases: { id: UseCase; label: string; icon: string; desc: string }[];
  themes: { id: string; label: string; icon: string }[];
  aiProviders: { id: AiProvider; label: string; icon: string }[];
  ngOnInit(): any;
  next(): any;
  back(): any;
  selectUseCase(id: UseCase): any;
  selectTheme(id: string): any;
  selectAiProvider(id: AiProvider): any;
  finish(): any;
  skip(): any;
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

## File: /libs/ui/src/lib/profile-manager/profile-manager.component.ts

### Class: ProfileManagerComponent
```typescript
class ProfileManagerComponent {
  workspaceService: any;
  workspaces: any;
  activeWorkspace: any;
  userName: any;
  isAddModalOpen: any;
  newProfileName: any;
  isEditModalOpen: any;
  editProfileId: any;
  editProfileName: any;
  editProfileColor: any;
  isDeleteModalOpen: any;
  profileToDelete: any;
  openAddModal(): any;
  cancelAdd(): any;
  confirmAdd(): any;
  switchWorkspace(id: string): any;
  openEditModal(wp: any): any;
  cancelEdit(): any;
  confirmEdit(): any;
  openDeleteModal(id: string): any;
  cancelDelete(): any;
  confirmDelete(): any;
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
  workspaceService: any;
  workspaces: any;
  activeWorkspace: any;
  isAddProfileModalOpen: any;
  newProfileName: any;
  switchWorkspace(id: string): any;
  addWorkspace(): any;
  confirmAddWorkspace(): any;
  cancelAddWorkspace(): any;
  manageProfiles(): any;
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
  handleEscape(event: Event): any;
}
```

---

## File: /libs/ui/src/lib/quick-find/quick-find.component.ts

### Class: QuickFindComponent
```typescript
class QuickFindComponent {
  isOpen: any;
  searchQuery: any;
  activeFilter: any;
  selectedIndex: any;
  semanticResults: any;
  isSearchingAI: any;
  aiAnswer: any;
  isAiStreaming: any;
  aiSources: any;
  typeMeta: any;
  filterTypes: FilterType[];
  isCommandMode: any;
  isAiMode: any;
  flatResults: any;
  groups: any;
  navList: any;
  totalCount: any;
  handleKeyboard(event: KeyboardEvent): any;
  open(): any;
  close(): any;
  clearQuery(): any;
  setFilter(f: FilterType): any;
  onInput(event: Event): any;
  submitAiQuery(): any;
  selectResult(result: QuickFindResult | undefined): any;
  getTypeColor(type: ResultType): string;
  getTypeLabel(type: ResultType): string;
  getFilterMeta(): { label: string; icon: string; color: string };
  getSemanticGlobalIndex(itemIndex: number): number;
  getGlobalIndex(group: ResultGroup, itemIndex: number): number;
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
  resetConfirm: any;
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
  versionHistoryLimit: any;
  aiProvider: any;
  aiModel: any;
  aiKey: any;
  showApiKey: any;
  testStatus: any;
  testMessage: any;
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
  testConnection(): any;
  getApiKeyPlaceholder(): string;
  setAiProvider(provider: AiProvider): any;
  setVersionHistoryLimit(event: Event): any;
  saveSettings(): any;
  resetToDefaults(): any;
  doResetToDefaults(): any;
}
```

---

## File: /libs/ui/src/lib/skeleton-loader/skeleton-loader.component.ts

### Class: SkeletonLoaderComponent
```typescript
class SkeletonLoaderComponent {
  variant: 'list' | 'card';
  rows: any;
}
```

---

## File: /libs/ui/src/lib/table/table.component.ts

### Class: TableComponent
```typescript
class TableComponent {
  columns: EnvTableColumn[];
  rows: EnvTableRow[];
  rowIdKey: any;
  tabs: EnvTableTab[];
  activeTab: any;
  showSearch: any;
  searchPlaceholder: any;
  searchValue: any;
  showSortFilter: any;
  showToolbar: any;
  actions: EnvTableAction[];
  showPagination: any;
  totalEntries: any;
  currentPage: any;
  pageSize: any;
  pageSizeOptions: number[];
  loading: any;
  tabChange: any;
  searchChange: any;
  sortChange: any;
  selectionChange: any;
  actionClick: any;
  bulkActionClick: any;
  pageChange: any;
  pageSizeChange: any;
  rowClick: any;
  sortByClick: any;
  filterClick: any;
  _page: any;
  _pageSize: any;
  sortKey: any;
  sortDir: any;
  selectedIds: any;
  openMenuId: any;
  ngOnChanges(changes: SimpleChanges): any;
  visiblePages(): (number | '...')[];
  isEllipsis(p: number | '...'): p is '...';
  padNum(n: number): string;
  isSelected(row: EnvTableRow): any;
  toggleSelect(row: EnvTableRow): any;
  toggleAll(): any;
  onSort(col: EnvTableColumn): any;
  toggleMenu(row: EnvTableRow, e: Event): any;
  isMenuOpen(row: EnvTableRow): any;
  onAction(row: EnvTableRow, actionKey: string): any;
  goToPage(page: number): any;
  onPageSizeChange(value: string): any;
  getAvatarCell(row: EnvTableRow, col: EnvTableColumn): { name: string; avatar?: string };
  getInitials(name: string): string;
  getAvatarBg(row: EnvTableRow, col: EnvTableColumn): string;
  getBadge(row: EnvTableRow, col: EnvTableColumn): { label: string; dotColor: string; bgColor: string; textColor: string };
  clearSelection(): any;
  onBulkAction(actionKey: string): any;
  onDocClick(): any;
}
```

### Interface: EnvTableColumn
```typescript
interface EnvTableColumn {
  key: string;
  header: string;
  type?: 'text' | 'avatar-text' | 'badge';
  sortable?: boolean;
  badgeMap?: Record<string, { label?: string; dotColor: string; bgColor: string; textColor: string }>;
}
```

### Interface: EnvTableTab
```typescript
interface EnvTableTab {
  key: string;
  label: string;
  count?: number;
}
```

### Interface: EnvTableAction
```typescript
interface EnvTableAction {
  key: string;
  label: string;
  icon?: string;
  danger?: boolean;
  bulk?: boolean;
}
```

### Interface: EnvTableSortEvent
```typescript
interface EnvTableSortEvent {
  key: string;
  direction: 'asc' | 'desc';
}
```

### Interface: EnvTableActionEvent
```typescript
interface EnvTableActionEvent {
  row: EnvTableRow;
  actionKey: string;
}
```

### Type: EnvTableRow
```typescript
type EnvTableRow = Record<string, any>;
```

---

## File: /libs/ui/src/lib/toast/toast.component.ts

### Class: ToastComponent
```typescript
class ToastComponent {
  toasts: any;
  iconFor(type: Notification['type']): string;
  show(n: Notification): any;
  dismiss(id: string): any;
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

## File: /apps/admin/src/app/pages/ai-settings/ai-settings.component.ts

### Class: AiSettingsComponent
```typescript
class AiSettingsComponent {
  providers: AiProvider[];
  provider: any;
  modelName: any;
  aiEnabled: any;
  showKey: any;
  toast: any;
  toastTimer?: ReturnType<typeof setTimeout>;
  saving: any;
  testing: any;
  loading: any;
  newKey: any;
  hasExistingKey: any;
  keyEditing: any;
  modelPlaceholder: any;
  needsKey: any;
  ngOnInit(): any;
  startEditKey(): any;
  cancelEditKey(): any;
  save(): any;
  testConnection(): any;
  onProviderChange(value: string): any;
}
```

---

## File: /apps/admin/src/app/pages/audit-log/audit-log.component.ts

### Class: AuditLogComponent
```typescript
class AuditLogComponent {
  entries: any;
  loading: any;
  ngOnInit(): any;
  meta(action: string): any;
}
```

---

## File: /apps/admin/src/app/pages/dashboard/dashboard.component.ts

### Class: DashboardComponent
```typescript
class DashboardComponent {
  totalUsers: any;
  aiRequestsToday: any;
  activeFlagCount: any;
  platformProvider: any;
  recentActivity: any;
  loading: any;
  ngOnInit(): any;
}
```

---

## File: /apps/admin/src/app/pages/feature-flags/feature-flags.component.ts

### Class: FeatureFlagsComponent
```typescript
class FeatureFlagsComponent {
  flags: any;
  loading: any;
  saving: any;
  toast: any;
  ngOnInit(): any;
  toggle(id: string): any;
  saveAll(): any;
}
```

---

## File: /apps/admin/src/app/pages/login/admin-login.component.ts

### Class: AdminLoginComponent
```typescript
class AdminLoginComponent {
  email: any;
  password: any;
  loading: any;
  error: any;
  handleLogin(): any;
}
```

---

## File: /apps/admin/src/app/pages/usage/usage.component.ts

### Class: UsageComponent
```typescript
class UsageComponent {
  dateFilter: any;
  summary: any;
  rows: any;
  providerChart: any;
  loading: any;
  ngOnInit(): any;
  setFilter(f: DateFilter): any;
  exportCsv(): any;
  formatChars(n: number): string;
}
```

---

## File: /apps/admin/src/app/pages/users/users.component.ts

### Class: UsersComponent
```typescript
class UsersComponent {
  PAGE_SIZE: any;
  searchQuery: any;
  allUsers: any;
  loading: any;
  currentPage: any;
  toast: any;
  pendingRole: any;
  pendingStatus: any;
  filteredUsers: any;
  totalPages: any;
  paginatedUsers: any;
  pages: any;
  ngOnInit(): any;
  goToPage(page: number): any;
  exportUsers(): any;
  requestRoleChange(user: AdminUser): any;
  requestStatusChange(user: AdminUser): any;
  confirmRoleChange(): any;
  confirmSuspend(): any;
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
  userName: any;
  userInitials: any;
  allActivities: any;
  filteredActivities: any;
  totalCount: any;
  visibleCount: any;
  goBack(): any;
  setFilter(filter: 'ALL' | 'ENTRY' | 'SYSTEM' | 'SYNC' | 'AI'): any;
  updateSearch(event: Event): any;
  toggleRow(id: string): any;
  refresh(): any;
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
  searchQuery: any;
  activeFilter: any;
  expandedRowId: any;
  restoringId: any;
  confirmDialog: any;
  allItems: any;
  filteredItems: any;
  totalCount: any;
  visibleCount: any;
  setFilter(filter: FilterType): any;
  updateSearch(event: Event): any;
  toggleRow(id: string): any;
  canRestore(type: BinItemType): boolean;
  openRestoreConfirm(id: string, title: string): any;
  openDeleteConfirm(id: string, title: string): any;
  openEmptyConfirm(): any;
  cancelConfirm(): any;
  confirmAction(): any;
  emptyBin(): any;
  getIconForType(type: string): string;
  formatType(type: string): string;
  formatDate(iso: string): string;
  formatTime(iso: string): string;
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

## File: /apps/desktop/src/app/components/knowledge/knowledge.component.ts

### Class: KnowledgeComponent
```typescript
class KnowledgeComponent {
  researchService: any;
  viewMode: any;
  selectedCollection: any;
  searchQuery: any;
  filterStatus: any;
  filterType: any;
  showCollectionModal: any;
  showSourceModal: any;
  showSummaryModal: any;
  showSourceDetail: any;
  selectedSource: any;
  showDeleteCollection: any;
  showDeleteSource: any;
  collectionToDelete: any;
  sourceToDelete: any;
  newCollectionName: any;
  newCollectionDesc: any;
  newCollectionColor: any;
  collectionColors: any;
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
  editNotes: any;
  aiSourceAnalysis: any;
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  aiSuggestions: any;
  sourceTypeOptions: any;
  libraries: any;
  filteredLibraries: any;
  sources: any;
  summaries: any;
  filteredSources: any;
  sourceStats: any;
  totalSources: any;
  hasActiveFilters: any;
  getSourceTypeMeta(type: string): any;
  getStatusMeta(status: string): any;
  formatSourceMeta(source: ResearchSource): string;
  openCollectionModal(): any;
  closeCollectionModal(): any;
  saveCollection(): any;
  selectCollection(collection: ResearchCollection): any;
  openDeleteCollection(collection: ResearchCollection, e: Event): any;
  cancelDeleteCollection(): any;
  confirmDeleteCollection(): any;
  openSourceModal(): any;
  closeSourceModal(): any;
  saveSource(): any;
  openSourceDetail(source: ResearchSource): any;
  closeSourceDetail(): any;
  updateSourceStatus(status: 'UNREAD' | 'READING' | 'PROCESSED'): any;
  saveNotes(): any;
  openDeleteSource(source: ResearchSource, e: Event): any;
  cancelDeleteSource(): any;
  confirmDeleteSource(): any;
  openSummaryModal(): any;
  closeSummaryModal(): any;
  saveSummary(): any;
  toggleSourceSelection(id: string): any;
  isSourceSelected(id: string): any;
  clearFilters(): any;
  toggleAssistant(): any;
  clearAiChat(): any;
  sendAiMessage(text: string): any;
  onKeyDown(e: KeyboardEvent): any;
}
```

---

## File: /apps/desktop/src/app/components/meetings/meetings.component.ts

### Class: MeetingsComponent
```typescript
class MeetingsComponent {
  meetingsService: any;
  deleteMeetingTarget: any;
  viewMode: any;
  viewFilter: any;
  selectedSpace: any;
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
  syncService: any;
  providerMeta: any;
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  aiSuggestions: any;
  showSyncModal: any;
  syncActiveProvider: any;
  syncNewName: any;
  syncNewUrl: any;
  syncAddError: any;
  syncProviders: CalendarConnection['provider'][];
  meetingColors: any;
  filteredMeetings: any;
  calendarWeeks: any;
  calendarHours: any;
  calendarTitle: any;
  weekDays: any;
  yearMonths: any;
  availableProjects: any;
  upcomingSyncs: any;
  stats: any;
  sidebarNavItems: any;
  tableColumns: EnvTableColumn[];
  tableActions: EnvTableAction[];
  tableRows: any;
  meetingsByProject: any;
  hasNoSpace: any;
  meetingsByStatus: any;
  todayMeetings: any;
  nextMeeting: any;
  meetingTypeBreakdown: any;
  getMeetingsForDate(date: Date): Meeting[];
  onNavItemClick(id: string): any;
  onTableRowClick(row: { id: string }): any;
  onTableAction(event: EnvTableActionEvent): any;
  onTableSort(event: EnvTableSortEvent): any;
  timeUntilMeeting(meeting: Meeting): string;
  isMeetingPast(meeting: Meeting): boolean;
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
  doDeleteMeeting(): any;
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
  navigatePrev(): any;
  navigateNext(): any;
  previousMonth(): any;
  nextMonth(): any;
  goToToday(): any;
  isToday(date: Date): boolean;
  isCurrentMonth(date: Date): boolean;
  getMeetingsForDay(date: Date): Meeting[];
  getMeetingTopPx(startTime: string): number;
  getMeetingHeightPx(startTime: string, endTime: string, duration: number): number;
  formatHour(h: number): string;
  getMonthMeetingDays(month: Date): Set<number>;
  getYearMonthWeeks(month: Date): Date[][];
  eventBg(color: string): string;
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
  toggleAssistant(): any;
  sendAiMessage(text: string): any;
  clearAiChat(): any;
  openSyncModal(): any;
  closeSyncModal(): any;
  addCalendarConnection(): any;
  syncAllCalendars(): any;
  trackByConnId(_: number, c: CalendarConnection): any;
}
```

---

## File: /apps/desktop/src/app/components/spaces/spaces.component.ts

### Class: SpacesComponent
```typescript
class SpacesComponent {
  workspaceService: any;
  profiles: any;
  activeProfile: any;
  linkedSpace: any;
  menuOpenId: any;
  switching: any;
  showModal: any;
  editMode: any;
  editProfileId: any;
  showDeleteConfirm: any;
  profileToDelete: any;
  showDetails: any;
  detailsProfile: any;
  formName: any;
  formColor: any;
  formIcon: any;
  colorOptions: any;
  iconOptions: any;
  toggleMenu(id: string): any;
  closeMenu(): any;
  isActive(id: string): any;
  isDeletable(id: string): any;
  getInitials(name: string): string;
  switchTo(profile: WorkspaceProfile): any;
  openNewModal(): any;
  openEditModal(profile: WorkspaceProfile): any;
  closeModal(): any;
  saveProfile(): any;
  openDetailsModal(profile: WorkspaceProfile): any;
  closeDetails(): any;
  openDeleteConfirm(profile: WorkspaceProfile): any;
  cancelDelete(): any;
  confirmDelete(): any;
  onKeyDown(e: KeyboardEvent): any;
}
```

---

## File: /apps/desktop/src/app/components/titlebar/titlebar.component.ts

### Class: TitlebarComponent
```typescript
class TitlebarComponent {
  activeTab: any;
  layout: any;
  ngOnInit(): any;
  setLayout(mode: NavLayout): any;
}
```

---

## File: /apps/desktop/src/app/components/update-banner/update-banner.component.ts

### Class: UpdateBannerComponent
```typescript
class UpdateBannerComponent {
  update: any;
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
  searchQuery: any;
  activeFilter: any;
  expandedRowId: any;
  restoringId: any;
  confirmDialog: any;
  allItems: any;
  filteredItems: any;
  totalCount: any;
  visibleCount: any;
  restorableCount: any;
  oldestItem: any;
  goBack(): any;
  setFilter(filter: FilterType): any;
  updateSearch(event: Event): any;
  toggleRow(id: string): any;
  openRestoreConfirm(id: string, title: string): any;
  openDeleteConfirm(id: string, title: string): any;
  openEmptyConfirm(): any;
  cancelConfirm(): any;
  confirmAction(): any;
  emptyBin(): any;
  canRestore(type: BinItemType): boolean;
  getIconForType(type: BinItemType): string;
  formatType(type: BinItemType): string;
  formatRelativeTime(iso: string): string;
  payloadPreview(item: BinItem): { label: string; value: string }[];
}
```

---

## File: /apps/web/src/app/components/developer-settings/developer-settings.component.ts

### Class: DeveloperSettingsComponent
```typescript
class DeveloperSettingsComponent {
  isImporting: any;
  importConfirm: any;
  pendingImportFileName: any;
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
  doImport(): any;
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

## File: /apps/web/src/app/components/knowledge/knowledge.component.ts

### Class: KnowledgeComponent
```typescript
class KnowledgeComponent {
  researchService: any;
  fileStorage: any;
  store: any;
  viewMode: any;
  selectedCollection: any;
  fileFilterType: any;
  isDraggingOver: any;
  fileToDelete: any;
  showDeleteFile: any;
  filteredFiles: any;
  searchQuery: any;
  filterStatus: any;
  filterType: any;
  sortField: any;
  sortDir: any;
  showAddModal: any;
  showNewCollectionForm: any;
  addTab: any;
  addNoteContent: any;
  isRecording: any;
  recordingDuration: any;
  recordedBlob: any;
  recordedUrl: any;
  recordingError: any;
  audioTitle: any;
  showSummaryModal: any;
  showSourceDetail: any;
  selectedSource: any;
  showDeleteCollection: any;
  showDeleteSource: any;
  showDeleteSummary: any;
  collectionToDelete: any;
  sourceToDelete: any;
  summaryToDelete: any;
  newCollectionName: any;
  newCollectionDesc: any;
  newCollectionColor: any;
  collectionColors: any;
  newSourceTitle: any;
  newSourceUrl: any;
  newSourceType: any;
  newSourceTags: any;
  newSourceDesc: any;
  newSourceAuthor: any;
  newSourceCollectionId: any;
  fetchingMeta: any;
  suggestingTags: any;
  newSummaryTitle: any;
  newSummaryContent: any;
  newSummaryTags: any;
  selectedSourceIds: any;
  selectedFileIds: any;
  generatingSummary: any;
  editNotes: any;
  editTitle: any;
  editUrl: any;
  editAuthor: any;
  editDescription: any;
  editTags: any;
  generatingNotes: any;
  showLinkTask: any;
  taskSearch: any;
  showUnsavedWarning: any;
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  aiSuggestions: any;
  sourceTypeOptions: any;
  sourceColumns: EnvTableColumn[];
  fileColumns: EnvTableColumn[];
  fileActions: EnvTableAction[];
  fileTableRows: any;
  summarySort: any;
  summaryColumns: EnvTableColumn[];
  summaryActions: EnvTableAction[];
  summaryTableRows: any;
  sourceActions: EnvTableAction[];
  sourceTableRows: any;
  collections: any;
  sources: any;
  summaries: any;
  filteredSources: any;
  collectionSourceCounts: any;
  hasActiveFilters: any;
  linkedTasks: any;
  availableTasks: any;
  hasTasks: any;
  notesDirty: any;
  collectionFiles: any;
  onFileAction(event: EnvTableActionEvent): any;
  fileMimeLabel(mimeType: string): string;
  onSummarySort(event: EnvTableSortEvent): any;
  onSummaryAction(event: EnvTableActionEvent): any;
  onSourceRowClick(row: EnvTableRow): any;
  onSourceAction(event: EnvTableActionEvent): any;
  onSourceSort(event: EnvTableSortEvent): any;
  getSourceTypeMeta(type: string): any;
  formatDate(dateStr: string | undefined): string;
  isSafeUrl(url: string | undefined): boolean;
  formatSourceMeta(source: ResearchSource): string;
  saveCollection(): any;
  switchView(mode: ViewMode): any;
  selectAllSources(): any;
  selectCollection(collection: ResearchCollection): any;
  moveSourceToCollection(sourceId: string, collectionId: string): any;
  openDeleteCollection(collection: ResearchCollection, e: Event): any;
  cancelDeleteCollection(): any;
  confirmDeleteCollection(): any;
  openAddModal(tab: 'url' | 'file' | 'note' | 'audio'): any;
  closeAddModal(): any;
  saveSource(): any;
  saveNote(): any;
  openFileInputFromModal(): any;
  fetchMetadata(): any;
  suggestTags(): any;
  openSourceDetail(source: ResearchSource): any;
  closeSourceDetail(): any;
  discardNotesAndClose(): any;
  cancelUnsavedWarning(): any;
  saveSourceField(field: 'title' | 'url' | 'author' | 'description' | 'tags'): any;
  updateSourceStatus(status: 'UNREAD' | 'READING' | 'PROCESSED'): any;
  saveNotes(): any;
  generateAiNotes(): any;
  openDeleteSource(source: ResearchSource, e: Event): any;
  cancelDeleteSource(): any;
  confirmDeleteSource(): any;
  linkTask(taskId: string): any;
  unlinkTask(taskId: string): any;
  openSummaryModal(): any;
  closeSummaryModal(): any;
  saveSummary(): any;
  toggleFileSelection(id: string): any;
  isFileSelected(id: string): any;
  generateAiSummary(): any;
  cancelDeleteSummary(): any;
  confirmDeleteSummary(): any;
  toggleSourceSelection(id: string): any;
  isSourceSelected(id: string): any;
  clearFilters(): any;
  toggleAssistant(): any;
  clearAiChat(): any;
  sendAiMessage(text: string): any;
  startRecording(): any;
  stopRecording(): any;
  discardRecording(): any;
  saveAudioRecording(): any;
  openAudioFileInput(): any;
  formatDuration(seconds: number): string;
  ngOnDestroy(): any;
  onFileDrop(event: DragEvent): any;
  onDragOver(event: DragEvent): any;
  onDragLeave(): any;
  openFileInput(): any;
  openDeleteFile(file: StorageFile): any;
  cancelDeleteFile(): any;
  confirmDeleteFile(): any;
  downloadFile(file: StorageFile): any;
  onKeyDown(e: KeyboardEvent): any;
}
```

---

## File: /apps/web/src/app/components/meetings/meetings.component.ts

### Class: MeetingsComponent
```typescript
class MeetingsComponent {
  meetingsService: any;
  syncService: any;
  providerMeta: any;
  deleteMeetingTarget: any;
  viewMode: any;
  viewFilter: any;
  selectedSpace: any;
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
  showAssistant: any;
  aiLoading: any;
  aiMessages: any;
  aiSuggestions: any;
  showSyncModal: any;
  syncActiveProvider: any;
  syncNewName: any;
  syncNewUrl: any;
  syncAddError: any;
  syncProviders: CalendarConnection['provider'][];
  meetingColors: any;
  filteredMeetings: any;
  calendarWeeks: any;
  availableProjects: any;
  upcomingSyncs: any;
  stats: any;
  sidebarNavItems: any;
  tableColumns: EnvTableColumn[];
  tableActions: EnvTableAction[];
  tableRows: any;
  meetingsByProject: any;
  hasNoSpace: any;
  nextMeeting: any;
  todayMeetings: any;
  meetingTypeBreakdown: any;
  meetingsByStatus: any;
  calendarHours: any;
  calendarTitle: any;
  weekDays: any;
  yearMonths: any;
  getMeetingsForDate(date: Date): Meeting[];
  onNavItemClick(id: string): any;
  onTableRowClick(row: { id: string }): any;
  onTableAction(event: EnvTableActionEvent): any;
  onTableSort(event: EnvTableSortEvent): any;
  timeUntilMeeting(meeting: Meeting): string;
  isMeetingPast(meeting: Meeting): boolean;
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
  doDeleteMeeting(): any;
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
  navigatePrev(): any;
  navigateNext(): any;
  previousMonth(): any;
  nextMonth(): any;
  goToToday(): any;
  isToday(date: Date): boolean;
  isCurrentMonth(date: Date): boolean;
  getMeetingsForDay(date: Date): Meeting[];
  getMeetingTopPx(startTime: string): number;
  getMeetingHeightPx(startTime: string, endTime: string, duration: number): number;
  formatHour(h: number): string;
  getMonthMeetingDays(month: Date): Set<number>;
  getYearMonthWeeks(month: Date): Date[][];
  eventBg(color: string): string;
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
  toggleAssistant(): any;
  sendAiMessage(text: string): any;
  clearAiChat(): any;
  openSyncModal(): any;
  closeSyncModal(): any;
  addCalendarConnection(): any;
  syncAllCalendars(): any;
  trackByConnId(_: number, c: CalendarConnection): any;
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

## File: /apps/web/src/app/components/spaces/spaces.component.ts

### Class: SpacesComponent
```typescript
class SpacesComponent {
  workspaceService: any;
  profiles: any;
  activeProfile: any;
  linkedSpace: any;
  menuOpenId: any;
  switching: any;
  showModal: any;
  editMode: any;
  editProfileId: any;
  showDeleteConfirm: any;
  profileToDelete: any;
  showDetails: any;
  detailsProfile: any;
  formName: any;
  formColor: any;
  formIcon: any;
  colorOptions: any;
  iconOptions: any;
  toggleMenu(id: string): any;
  closeMenu(): any;
  isActive(id: string): any;
  isDeletable(id: string): any;
  getInitials(name: string): string;
  switchTo(profile: WorkspaceProfile): any;
  openNewModal(): any;
  openEditModal(profile: WorkspaceProfile): any;
  closeModal(): any;
  saveProfile(): any;
  openDetailsModal(profile: WorkspaceProfile): any;
  closeDetails(): any;
  openDeleteConfirm(profile: WorkspaceProfile): any;
  cancelDelete(): any;
  confirmDelete(): any;
  onKeyDown(e: KeyboardEvent): any;
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

## File: /libs/feature-novels/src/lib/write/composer/composer.component.ts

### Class: ComposerComponent
```typescript
class ComposerComponent {
  editor: Editor;
  bookService: any;
  versionHistoryService: any;
  aiService: any;
  route: any;
  addInputRef: ElementRef<HTMLInputElement>;
  title: any;
  activeChapterId: any;
  activeGroupId: any;
  wordCount: any;
  rightSidebarTab: any;
  activeNav: any;
  activeFrontMatterId: any;
  activePrologueId: any;
  focusMode: any;
  showFocusToast: any;
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
  book: any;
  isLoading: any;
  sectionLabel: any;
  showExtendedTabs: any;
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
  filteredChapters: any;
  linkModalOpen: any;
  linkUrl: any;
  linkText: any;
  imageModalOpen: any;
  imageUrl: any;
  youtubeModalOpen: any;
  youtubeUrl: any;
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
  performUndo(): any;
  performRedo(): any;
  openVersionHistory(): any;
  closeVersionHistory(): any;
  restoreVersion(versionId: string): any;
  selectSearchResult(result: { type: string, id: string }): any;
  toggleFocusMode(): any;
  dismissFocusToast(): any;
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
  insertImage(): any;
  cancelImageModal(): any;
  insertTable(): any;
  addYoutube(): any;
  insertYoutube(): any;
  cancelYoutubeModal(): any;
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
  isTauri: any;
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
  isCollapsed: any;
  isOnline: any;
  ngOnInit(): any;
  ngOnDestroy(): any;
  toggleCollapse(): any;
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
  subNavVisibleChange: any;
  quickFind?: QuickFindComponent;
  addNewModal?: AddNewModalComponent;
  settingsModal?: SettingsModalComponent;
  notificationCenter?: NotificationCenterComponent;
  profileMenu?: ProfileMenuComponent;
  profileEditor?: ProfileEditorComponent;
  themeService: any;
  notificationService: any;
  userService: any;
  showSpaceSwitcher: any;
  spaces: any;
  activeSpace: any;
  binCount: any;
  unreadCount: any;
  user: any;
  userInitials: any;
  navigationLayout: any;
  isAvatarLoading: any;
  sidebarCollapsed: any;
  voiceService: any;
  isVoiceActive: any;
  currentRouteSegment: any;
  navItems: NavItem[];
  toggleSpaceSwitcher(): any;
  closeSpaceSwitcher(): any;
  switchSpace(id: string): any;
  manageSpaces(): any;
  getThemeIcon(): string;
  getNextTheme(): string;
  toggleTheme(): any;
  toggleVoice(): any;
  onAvatarLoad(): any;
  onAvatarError(): any;
  navigateTo(route: string): any;
  getTabIcon(tab: string): string;
  isItemActive(item: NavItem): boolean;
  isWorkspaceActive(): boolean;
  openQuickFind(): any;
  openAddNew(): any;
  openSettings(): any;
  openNotifications(): any;
  openProfileMenu(): any;
  handleOpenSettings(): any;
  handleOpenProfile(): any;
  toggleSidebar(): any;
  ngOnInit(): any;
  ngOnDestroy(): any;
}
```

### Interface: NavItem
```typescript
interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
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

## File: /libs/feature-novels/src/lib/write/composer/components/editor/character-details/character-details.component.ts

### Class: CharacterDetailsComponent
```typescript
class CharacterDetailsComponent {
  character: any;
  updateField: any;
  addNewCharacter: any;
}
```

---

## File: /libs/feature-novels/src/lib/write/composer/components/editor/editor-header/editor-header.component.ts

### Class: EditorHeaderComponent
```typescript
class EditorHeaderComponent {
  activeNav: any;
  showExtendedTabs: any;
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

## File: /libs/feature-novels/src/lib/write/composer/components/editor/editor-toolbar/editor-toolbar.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/editor/location-details/location-details.component.ts

### Class: LocationDetailsComponent
```typescript
class LocationDetailsComponent {
  location: any;
  updateField: any;
  addNewLocation: any;
}
```

---

## File: /libs/feature-novels/src/lib/write/composer/components/editor/manuscript-editor/manuscript-editor.component.ts

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
  chapterStatusLabel(): string;
  formatSaved(date: Date): string;
}
```

---

## File: /libs/feature-novels/src/lib/write/composer/components/editor/structure-editor/structure-editor.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/modals/add-modal/add-modal.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/modals/delete-modal/delete-modal.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/modals/link-modal/link-modal.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/modals/version-history-modal/version-history-modal.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/right-sidebar/ai-panel/ai-panel.component.ts

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
  formatMessage(content: string): SafeHtml;
  formatTime(date: Date): string;
  ngDoCheck(): any;
  handleChatEnter(event: KeyboardEvent): any;
}
```

---

## File: /libs/feature-novels/src/lib/write/composer/components/right-sidebar/manuscript-data/manuscript-data.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/right-sidebar/notes-panel/notes-panel.component.ts

### Class: NotesPanelComponent
```typescript
class NotesPanelComponent {
  notes: any;
  addNewNote: any;
  deleteNote: any;
  updateNote: any;
  editingNoteId: any;
  editTitle: any;
  editBody: any;
  startEdit(note: EditorNote, event: Event): any;
  commitEdit(id: string): any;
  cancelEdit(): any;
}
```

---

## File: /libs/feature-novels/src/lib/write/composer/components/sidebar/chapters-list/chapters-list.component.ts

### Class: ChaptersListComponent
```typescript
class ChaptersListComponent {
  chapters: any;
  activeChapterId: any;
  bulkMode: any;
  selectedChapters: any;
  addMenuOpen: any;
  sectionLabel: any;
  selectChapter: any;
  toggleChapter: any;
  deleteChapter: any;
  deleteGroup: any;
  renameChapter: any;
  toggleBulkMode: any;
  bulkDelete: any;
  toggleAddMenu: any;
  addNewActOrPart: any;
  addNewChapter: any;
  toggleChapterSelection: any;
  renamingChapterId: any;
  renameValue: any;
  dragStartIndex: any;
  dragOverIndex: any;
  startRename(chap: Chapter, event: Event): any;
  commitRename(id: string): any;
  cancelRename(): any;
  onDragStart(event: DragEvent, index: number, type: 'chapter' | 'group'): any;
  onDragOver(event: DragEvent, index: number): any;
  onDragEnd(): any;
  onDrop(event: DragEvent, dropIndex: number, type: 'chapter' | 'group', groupId: string): any;
}
```

---

## File: /libs/feature-novels/src/lib/write/composer/components/sidebar/characters-list/characters-list.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/sidebar/locations-list/locations-list.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/sidebar/structure-view/structure-view.component.ts

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

## File: /libs/feature-novels/src/lib/write/composer/components/sidebar/sync-status/sync-status.component.ts

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

