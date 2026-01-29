import { Injectable } from '@angular/core';
import {
  createRxDatabase,
  RxCollection,
  RxDatabase,
  RxDocumentData,
  RxJsonSchema,
} from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import type {
  Task,
  Note,
  PlanningItem,
  Activity,
  Novel,
} from '../../services/store.service';
import type { BinItem } from '../../services/bin.service';
import type { Snippet } from '../../services/snippets.service';
import type { Book } from '../../services/books.service';
import type { Meeting } from '../../services/meetings.service';
import type { Article } from '../../services/article.service';
import type { JournalProject, JournalEntry, JournalColumn } from '../../services/journal.service';
import type { ResearchLibrary, ResearchSource, ResearchSummary } from '../../services/research.service';

const DB_NAME = 'envello_db';

export type TaskDoc = Task;
export type NoteDoc = Note;
export type PlanningItemDoc = PlanningItem;
export type ActivityDoc = Activity;
export type NovelDoc = Novel;
export type BinItemDoc = BinItem;
export type SnippetDoc = Snippet;
export type BookDoc = Book;
export type MeetingDoc = Meeting;
export type ArticleDoc = Article;
export type JournalProjectDoc = JournalProject;
export type JournalEntryDoc = JournalEntry;
export type JournalColumnDoc = JournalColumn;
export type ResearchLibraryDoc = ResearchLibrary;
export type ResearchSourceDoc = ResearchSource;
export type ResearchSummaryDoc = ResearchSummary;

export interface NovelContentDoc {
  id: string;
  data: string;
}

export type EnvelloCollections = {
  tasks: RxCollection<TaskDoc>;
  notes: RxCollection<NoteDoc>;
  planningItems: RxCollection<PlanningItemDoc>;
  activities: RxCollection<ActivityDoc>;
  novels: RxCollection<NovelDoc>;
  novelContent: RxCollection<NovelContentDoc>;
  binItems: RxCollection<BinItemDoc>;
  snippets: RxCollection<SnippetDoc>;
  books: RxCollection<BookDoc>;
  meetings: RxCollection<MeetingDoc>;
  articles: RxCollection<ArticleDoc>;
  journalProjects: RxCollection<JournalProjectDoc>;
  journalEntries: RxCollection<JournalEntryDoc>;
  journalColumns: RxCollection<JournalColumnDoc>;
  researchLibraries: RxCollection<ResearchLibraryDoc>;
  researchSources: RxCollection<ResearchSourceDoc>;
  researchSummaries: RxCollection<ResearchSummaryDoc>;
};

export type EnvelloDatabase = RxDatabase<EnvelloCollections>;

const taskSchema: RxJsonSchema<TaskDoc> = {
  title: 'tasks',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    title: { type: 'string' },
    priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
    hours: { type: 'string' },
    status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'PENDING'] },
    project: { type: 'string' },
    due: { type: 'string' },
    labels: { type: 'array', items: { type: 'string' } },
    reminders: { type: 'array', items: { type: 'string' } },
    subtasks: { type: 'array', items: { type: 'object' } },
    parentId: { type: 'string' },
    dependencies: { type: 'array', items: { type: 'string' } },
    recurring: { type: 'object' },
    timeSpent: { type: 'number' },
    notes: { type: 'string' },
    attachments: { type: 'array', items: { type: 'object' } },
    description: { type: 'string' },
    startDate: { type: 'string' },
    estimatedDuration: { type: 'number' },
  },
  required: ['id', 'title', 'priority', 'hours', 'status'],
};

const noteSchema: RxJsonSchema<NoteDoc> = {
  title: 'notes',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    date: { type: 'string' },
    title: { type: 'string' },
    preview: { type: 'string' },
    content: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    lastEdited: { type: 'string' },
  },
  required: ['id', 'date', 'title', 'preview', 'content'],
};

const planningItemSchema: RxJsonSchema<PlanningItemDoc> = {
  title: 'planning_items',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    title: { type: 'string' },
    tag: { type: 'string' },
    stage: { type: 'string' },
    active: { type: 'boolean' },
  },
  required: ['id', 'title', 'tag', 'stage', 'active'],
};

const activitySchema: RxJsonSchema<ActivityDoc> = {
  title: 'activities',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    text: { type: 'string' },
    time: { type: 'string' },
    type: { type: 'string', enum: ['entry', 'sync', 'ai', 'system'] },
  },
  required: ['id', 'text', 'time', 'type'],
};

const novelSchema: RxJsonSchema<NovelDoc> = {
  title: 'novels',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    title: { type: 'string' },
    icon: { type: 'string' },
    status: { type: 'string', enum: ['DRAFTING', 'PLANNING', 'REVISING', 'PUBLISHED'] },
    wordCount: { type: 'number' },
    targetWordCount: { type: 'number' },
    progress: { type: 'number' },
    chapters: { type: 'number' },
    notesCount: { type: 'number' },
    createdDate: { type: 'string' },
    lastUpdated: { type: 'string' },
    genre: { type: 'array', items: { type: 'string' } },
    isRecentlyUpdated: { type: 'boolean' },
    coverImage: { type: 'string' },
  },
  required: ['id', 'title', 'icon', 'status', 'wordCount', 'targetWordCount', 'progress', 'chapters', 'notesCount', 'createdDate', 'lastUpdated', 'genre', 'isRecentlyUpdated'],
};

const novelContentSchema: RxJsonSchema<NovelContentDoc> = {
  title: 'novel_content',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    data: { type: 'string' },
  },
  required: ['id', 'data'],
};

const binItemSchema: RxJsonSchema<BinItemDoc> = {
  title: 'bin_items',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    type: { type: 'string' },
    originalId: { type: 'string' },
    contextId: { type: 'string' },
    title: { type: 'string' },
    deletedAt: { type: 'string' },
    payload: {},
  },
  required: ['id', 'type', 'originalId', 'deletedAt'],
};

const snippetSchema: RxJsonSchema<SnippetDoc> = {
  title: 'snippets',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    title: { type: 'string' },
    lang: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    content: { type: 'string' },
    filename: { type: 'string' },
    path: { type: 'string' },
    creator: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'title', 'lang', 'tags', 'content', 'filename', 'path', 'creator', 'createdAt', 'updatedAt'],
};

const bookSchema: RxJsonSchema<BookDoc> = {
  title: 'books',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    title: { type: 'string' },
    author: { type: 'string' },
    category: { type: 'string' },
    status: { type: 'string' },
    progress: { type: 'number' },
    notesCount: { type: 'number' },
    lastAccessed: { type: 'string' },
    coverImage: { type: 'string' },
    isbn: { type: 'string' },
    year: { type: 'number' },
    notes: { type: 'array', items: { type: 'object' } },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'title', 'author', 'category', 'status', 'progress', 'notesCount', 'lastAccessed', 'createdAt', 'updatedAt'],
};

const meetingSchema: RxJsonSchema<MeetingDoc> = {
  title: 'meetings',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    title: { type: 'string' },
    description: { type: 'string' },
    project: { type: 'string' },
    date: { type: 'string' },
    startTime: { type: 'string' },
    endTime: { type: 'string' },
    duration: { type: 'number' },
    timezone: { type: 'string' },
    location: { type: 'string' },
    meetingLink: { type: 'string' },
    meetingType: { type: 'string' },
    platform: { type: 'string' },
    attendees: { type: 'array', items: { type: 'object' } },
    organizer: { type: 'object' },
    agenda: { type: 'array', items: { type: 'object' } },
    notes: { type: 'array', items: { type: 'object' } },
    actionItems: { type: 'array', items: { type: 'object' } },
    status: { type: 'string' },
    priority: { type: 'string' },
    color: { type: 'string' },
    labels: { type: 'array', items: { type: 'string' } },
    recurring: { type: 'object' },
    reminders: { type: 'array', items: { type: 'object' } },
    attachments: { type: 'array', items: { type: 'object' } },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    createdBy: { type: 'string' },
  },
  required: ['id', 'title', 'date', 'startTime', 'meetingType', 'attendees', 'status', 'color', 'createdAt', 'updatedAt'],
};

const articleSchema: RxJsonSchema<ArticleDoc> = {
  title: 'articles',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    title: { type: 'string' },
    platform: { type: 'string' },
    pipeline: { type: 'string' },
    wordCount: { type: 'number' },
    content: { type: 'string' },
    url: { type: 'string' },
    scheduledDate: { type: 'string' },
    engagement: { type: 'object' },
    tags: { type: 'array', items: { type: 'string' } },
    lastUpdated: { type: 'string' },
    createdDate: { type: 'string' },
    icon: { type: 'string' },
    excerpt: { type: 'string' },
  },
  required: ['id', 'title', 'platform', 'pipeline', 'wordCount', 'tags', 'lastUpdated', 'createdDate', 'icon'],
};

const journalProjectSchema: RxJsonSchema<JournalProjectDoc> = {
  title: 'journal_projects',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    title: { type: 'string' },
    description: { type: 'string' },
    entriesCount: { type: 'number' },
    active: { type: 'boolean' },
    wordCount: { type: 'number' },
    targetWordCount: { type: 'number' },
    progress: { type: 'number' },
    createdDate: { type: 'string' },
    lastUpdated: { type: 'string' },
    columns: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    isLocked: { type: 'boolean' },
  },
  required: ['id', 'title', 'entriesCount', 'active', 'wordCount', 'createdDate', 'lastUpdated', 'columns'],
};

const journalEntrySchema: RxJsonSchema<JournalEntryDoc> = {
  title: 'journal_entries',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    projectId: { type: 'string' },
    title: { type: 'string' },
    content: { type: 'string' },
    preview: { type: 'string' },
    type: { type: 'string' },
    column: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    wordCount: { type: 'number' },
    characterCount: { type: 'number' },
    createdDate: { type: 'string' },
    lastEdited: { type: 'string' },
    hasAi: { type: 'boolean' },
    isAiEdited: { type: 'boolean' },
    progress: { type: 'number' },
    statusColor: { type: 'string' },
    meta: { type: 'string' },
    isLocked: { type: 'boolean' },
    linkedEntries: { type: 'array', items: { type: 'string' } },
    isPinned: { type: 'boolean' },
    isFavorite: { type: 'boolean' },
  },
  required: ['id', 'projectId', 'title', 'content', 'preview', 'type', 'column', 'wordCount', 'characterCount', 'createdDate', 'lastEdited'],
};

const journalColumnSchema: RxJsonSchema<JournalColumnDoc> = {
  title: 'journal_columns',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    name: { type: 'string' },
    color: { type: 'string' },
    order: { type: 'number' },
  },
  required: ['id', 'name', 'color', 'order'],
};

const researchLibrarySchema: RxJsonSchema<ResearchLibraryDoc> = {
  title: 'research_libraries',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    name: { type: 'string' },
    description: { type: 'string' },
    color: { type: 'string' },
    createdDate: { type: 'string' },
    lastModified: { type: 'string' },
  },
  required: ['id', 'name', 'createdDate', 'lastModified'],
};

const researchSourceSchema: RxJsonSchema<ResearchSourceDoc> = {
  title: 'research_sources',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    libraryId: { type: 'string' },
    title: { type: 'string' },
    sourceType: { type: 'string' },
    url: { type: 'string' },
    description: { type: 'string' },
    author: { type: 'string' },
    publishDate: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    status: { type: 'string' },
    notes: { type: 'string' },
    createdDate: { type: 'string' },
    lastAccessed: { type: 'string' },
  },
  required: ['id', 'libraryId', 'title', 'sourceType', 'tags', 'status', 'createdDate'],
};

const researchSummarySchema: RxJsonSchema<ResearchSummaryDoc> = {
  title: 'research_summaries',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 256 },
    libraryId: { type: 'string' },
    title: { type: 'string' },
    content: { type: 'string' },
    sourceIds: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    createdDate: { type: 'string' },
    lastModified: { type: 'string' },
  },
  required: ['id', 'libraryId', 'title', 'content', 'sourceIds', 'tags', 'createdDate', 'lastModified'],
};

@Injectable({ providedIn: 'root' })
export class RxDBService {
  private db: EnvelloDatabase | null = null;
  private initPromise: Promise<EnvelloDatabase> | null = null;

  async getDb(): Promise<EnvelloDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initDb();
    return this.initPromise;
  }

  private async initDb(): Promise<EnvelloDatabase> {
    const db = await createRxDatabase<EnvelloCollections>({
      name: DB_NAME,
      storage: getRxStorageDexie(),
      multiInstance: false,
    });

    await db.addCollections({
      tasks: { schema: taskSchema },
      notes: { schema: noteSchema },
      planningItems: { schema: planningItemSchema },
      activities: { schema: activitySchema },
      novels: { schema: novelSchema },
      novelContent: { schema: novelContentSchema },
      binItems: { schema: binItemSchema },
      snippets: { schema: snippetSchema },
      books: { schema: bookSchema },
      meetings: { schema: meetingSchema },
      articles: { schema: articleSchema },
      journalProjects: { schema: journalProjectSchema },
      journalEntries: { schema: journalEntrySchema },
      journalColumns: { schema: journalColumnSchema },
      researchLibraries: { schema: researchLibrarySchema },
      researchSources: { schema: researchSourceSchema },
      researchSummaries: { schema: researchSummarySchema },
    });

    this.db = db;
    return db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────
  async getAllTasks(): Promise<TaskDoc[]> {
    const d = await this.getDb();
    const docs = await d.tasks.find().exec();
    return docs.map((doc) => doc.toJSON() as TaskDoc);
  }

  async upsertTask(task: TaskDoc): Promise<void> {
    const d = await this.getDb();
    await d.tasks.upsert(task as RxDocumentData<TaskDoc>);
  }

  async upsertTasks(tasks: TaskDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.tasks.bulkUpsert(tasks.map((t) => t as RxDocumentData<TaskDoc>));
  }

  async removeTask(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.tasks.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  tasks$() {
    return (async () => {
      const d = await this.getDb();
      return d.tasks.find().$;
    })();
  }

  // ─── Notes ─────────────────────────────────────────────────────────────────
  async getAllNotes(): Promise<NoteDoc[]> {
    const d = await this.getDb();
    const docs = await d.notes.find().exec();
    return docs.map((doc) => doc.toJSON() as NoteDoc);
  }

  async upsertNote(note: NoteDoc): Promise<void> {
    const d = await this.getDb();
    await d.notes.upsert(note as RxDocumentData<NoteDoc>);
  }

  async upsertNotes(notes: NoteDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.notes.bulkUpsert(notes.map((n) => n as RxDocumentData<NoteDoc>));
  }

  async removeNote(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.notes.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  notes$() {
    return (async () => {
      const d = await this.getDb();
      return d.notes.find().$;
    })();
  }

  // ─── Planning items ────────────────────────────────────────────────────────
  async getAllPlanningItems(): Promise<PlanningItemDoc[]> {
    const d = await this.getDb();
    const docs = await d.planningItems.find().exec();
    return docs.map((doc) => doc.toJSON() as PlanningItemDoc);
  }

  async upsertPlanningItem(item: PlanningItemDoc): Promise<void> {
    const d = await this.getDb();
    await d.planningItems.upsert(item as RxDocumentData<PlanningItemDoc>);
  }

  async upsertPlanningItems(items: PlanningItemDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.planningItems.bulkUpsert(items.map((i) => i as RxDocumentData<PlanningItemDoc>));
  }

  planningItems$() {
    return (async () => {
      const d = await this.getDb();
      return d.planningItems.find().$;
    })();
  }

  // ─── Activities ────────────────────────────────────────────────────────────
  async getAllActivities(): Promise<ActivityDoc[]> {
    const d = await this.getDb();
    const docs = await d.activities.find().exec();
    return docs.map((doc) => doc.toJSON() as ActivityDoc);
  }

  async upsertActivity(act: ActivityDoc): Promise<void> {
    const d = await this.getDb();
    await d.activities.upsert(act as RxDocumentData<ActivityDoc>);
  }

  async upsertActivities(activities: ActivityDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.activities.bulkUpsert(activities.map((a) => a as RxDocumentData<ActivityDoc>));
  }

  async removeActivity(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.activities.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  activities$() {
    return (async () => {
      const d = await this.getDb();
      return d.activities.find().$;
    })();
  }

  // ─── Novels ────────────────────────────────────────────────────────────────
  async getAllNovels(): Promise<NovelDoc[]> {
    const d = await this.getDb();
    const docs = await d.novels.find().exec();
    return docs.map((doc) => doc.toJSON() as NovelDoc);
  }

  async upsertNovel(novel: NovelDoc): Promise<void> {
    const d = await this.getDb();
    await d.novels.upsert(novel as RxDocumentData<NovelDoc>);
  }

  async upsertNovels(novels: NovelDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.novels.bulkUpsert(novels.map((n) => n as RxDocumentData<NovelDoc>));
  }

  async removeNovel(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.novels.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  novels$() {
    return (async () => {
      const d = await this.getDb();
      return d.novels.find().$;
    })();
  }

  // ─── Novel content (JSON blob) ──────────────────────────────────────────────
  async getNovelContent(id: string): Promise<string | null> {
    const d = await this.getDb();
    const doc = await d.novelContent.findOne({ selector: { id } }).exec();
    return doc ? (doc.toJSON() as NovelContentDoc).data : null;
  }

  async setNovelContent(id: string, data: string): Promise<void> {
    const d = await this.getDb();
    await d.novelContent.upsert({ id, data } as RxDocumentData<NovelContentDoc>);
  }

  async removeNovelContent(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.novelContent.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Bin items ─────────────────────────────────────────────────────────────
  async getAllBinItems(): Promise<BinItemDoc[]> {
    const d = await this.getDb();
    const docs = await d.binItems.find().exec();
    return docs.map((doc) => doc.toJSON() as BinItemDoc);
  }

  async upsertBinItem(item: BinItemDoc): Promise<void> {
    const d = await this.getDb();
    await d.binItems.upsert(item as RxDocumentData<BinItemDoc>);
  }

  async upsertBinItems(items: BinItemDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.binItems.bulkUpsert(items.map((i) => i as RxDocumentData<BinItemDoc>));
  }

  async removeBinItem(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.binItems.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  async clearBin(): Promise<void> {
    const d = await this.getDb();
    const docs = await d.binItems.find().exec();
    for (const doc of docs) await doc.remove();
  }

  binItems$() {
    return (async () => {
      const d = await this.getDb();
      return d.binItems.find().$;
    })();
  }

  // ─── Snippets ──────────────────────────────────────────────────────────────
  async getAllSnippets(): Promise<SnippetDoc[]> {
    const d = await this.getDb();
    const docs = await d.snippets.find().exec();
    return docs.map((doc) => doc.toJSON() as SnippetDoc);
  }

  async upsertSnippet(doc: SnippetDoc): Promise<void> {
    const d = await this.getDb();
    await d.snippets.upsert(doc as RxDocumentData<SnippetDoc>);
  }

  async removeSnippet(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.snippets.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Books ─────────────────────────────────────────────────────────────────
  async getAllBooks(): Promise<BookDoc[]> {
    const d = await this.getDb();
    const docs = await d.books.find().exec();
    return docs.map((doc) => doc.toJSON() as BookDoc);
  }

  async upsertBook(doc: BookDoc): Promise<void> {
    const d = await this.getDb();
    await d.books.upsert(doc as RxDocumentData<BookDoc>);
  }

  async removeBook(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.books.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Meetings ──────────────────────────────────────────────────────────────
  async getAllMeetings(): Promise<MeetingDoc[]> {
    const d = await this.getDb();
    const docs = await d.meetings.find().exec();
    return docs.map((doc) => doc.toJSON() as MeetingDoc);
  }

  async upsertMeeting(doc: MeetingDoc): Promise<void> {
    const d = await this.getDb();
    await d.meetings.upsert(doc as RxDocumentData<MeetingDoc>);
  }

  async removeMeeting(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.meetings.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Articles ──────────────────────────────────────────────────────────────
  async getAllArticles(): Promise<ArticleDoc[]> {
    const d = await this.getDb();
    const docs = await d.articles.find().exec();
    return docs.map((doc) => doc.toJSON() as ArticleDoc);
  }

  async upsertArticle(doc: ArticleDoc): Promise<void> {
    const d = await this.getDb();
    await d.articles.upsert(doc as RxDocumentData<ArticleDoc>);
  }

  async upsertArticles(docs: ArticleDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.articles.bulkUpsert(docs.map((a) => a as RxDocumentData<ArticleDoc>));
  }

  async removeArticle(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.articles.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Journal projects ──────────────────────────────────────────────────────
  async getAllJournalProjects(): Promise<JournalProjectDoc[]> {
    const d = await this.getDb();
    const docs = await d.journalProjects.find().exec();
    return docs.map((doc) => doc.toJSON() as JournalProjectDoc);
  }

  async upsertJournalProject(doc: JournalProjectDoc): Promise<void> {
    const d = await this.getDb();
    await d.journalProjects.upsert(doc as RxDocumentData<JournalProjectDoc>);
  }

  async removeJournalProject(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.journalProjects.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Journal entries ───────────────────────────────────────────────────────
  async getAllJournalEntries(): Promise<JournalEntryDoc[]> {
    const d = await this.getDb();
    const docs = await d.journalEntries.find().exec();
    return docs.map((doc) => doc.toJSON() as JournalEntryDoc);
  }

  async upsertJournalEntry(doc: JournalEntryDoc): Promise<void> {
    const d = await this.getDb();
    await d.journalEntries.upsert(doc as RxDocumentData<JournalEntryDoc>);
  }

  async upsertJournalEntries(docs: JournalEntryDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.journalEntries.bulkUpsert(docs.map((e) => e as RxDocumentData<JournalEntryDoc>));
  }

  async removeJournalEntry(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.journalEntries.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Journal columns ───────────────────────────────────────────────────────
  async getAllJournalColumns(): Promise<JournalColumnDoc[]> {
    const d = await this.getDb();
    const docs = await d.journalColumns.find().exec();
    return docs.map((doc) => doc.toJSON() as JournalColumnDoc);
  }

  async upsertJournalColumn(doc: JournalColumnDoc): Promise<void> {
    const d = await this.getDb();
    await d.journalColumns.upsert(doc as RxDocumentData<JournalColumnDoc>);
  }

  async upsertJournalColumns(docs: JournalColumnDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.journalColumns.bulkUpsert(docs.map((c) => c as RxDocumentData<JournalColumnDoc>));
  }

  async removeJournalColumn(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.journalColumns.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Research libraries ─────────────────────────────────────────────────────
  async getAllResearchLibraries(): Promise<ResearchLibraryDoc[]> {
    const d = await this.getDb();
    const docs = await d.researchLibraries.find().exec();
    return docs.map((doc) => doc.toJSON() as ResearchLibraryDoc);
  }

  async upsertResearchLibrary(doc: ResearchLibraryDoc): Promise<void> {
    const d = await this.getDb();
    await d.researchLibraries.upsert(doc as RxDocumentData<ResearchLibraryDoc>);
  }

  async removeResearchLibrary(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.researchLibraries.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Research sources ───────────────────────────────────────────────────────
  async getAllResearchSources(): Promise<ResearchSourceDoc[]> {
    const d = await this.getDb();
    const docs = await d.researchSources.find().exec();
    return docs.map((doc) => doc.toJSON() as ResearchSourceDoc);
  }

  async upsertResearchSource(doc: ResearchSourceDoc): Promise<void> {
    const d = await this.getDb();
    await d.researchSources.upsert(doc as RxDocumentData<ResearchSourceDoc>);
  }

  async upsertResearchSources(docs: ResearchSourceDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.researchSources.bulkUpsert(docs.map((s) => s as RxDocumentData<ResearchSourceDoc>));
  }

  async removeResearchSource(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.researchSources.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }

  // ─── Research summaries ─────────────────────────────────────────────────────
  async getAllResearchSummaries(): Promise<ResearchSummaryDoc[]> {
    const d = await this.getDb();
    const docs = await d.researchSummaries.find().exec();
    return docs.map((doc) => doc.toJSON() as ResearchSummaryDoc);
  }

  async upsertResearchSummary(doc: ResearchSummaryDoc): Promise<void> {
    const d = await this.getDb();
    await d.researchSummaries.upsert(doc as RxDocumentData<ResearchSummaryDoc>);
  }

  async upsertResearchSummaries(docs: ResearchSummaryDoc[]): Promise<void> {
    const d = await this.getDb();
    await d.researchSummaries.bulkUpsert(docs.map((s) => s as RxDocumentData<ResearchSummaryDoc>));
  }

  async removeResearchSummary(id: string): Promise<void> {
    const d = await this.getDb();
    const doc = await d.researchSummaries.findOne({ selector: { id } }).exec();
    if (doc) await doc.remove();
  }
}
