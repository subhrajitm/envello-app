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

const DB_NAME = 'envello_db';

/** Stored document types (matches app interfaces). */
export type TaskDoc = Task;
export type NoteDoc = Note;
export type PlanningItemDoc = PlanningItem;
export type ActivityDoc = Activity;
export type NovelDoc = Novel;
export type BinItemDoc = BinItem;

/** NovelContent stored as { id, data } – data is JSON string of full content. */
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
    payload: {}, // arbitrary JSON
  },
  required: ['id', 'type', 'originalId', 'deletedAt'],
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
}
