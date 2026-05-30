import { Injectable, inject, effect } from '@angular/core';
import { embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AiService } from './ai.service';
import { StoreService } from './store.service';

export interface SemanticResult {
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

interface IndexEntry {
    result: SemanticResult;
    vector: number[];
}

@Injectable({ providedIn: 'root' })
export class SemanticSearchService {
    private ai = inject(AiService);
    private store = inject(StoreService);

    private index: IndexEntry[] = [];
    private dirty = true;
    private indexing = false;
    private cachedModel: ReturnType<ReturnType<typeof createOpenAI>['textEmbeddingModel']> | null = null;
    private cachedProvider = '';
    private cachedKey = '';

    constructor() {
        effect(() => {
            this.store.notes();
            this.store.bookmarks();
            this.store.tasks();
            this.store.books();
            this.dirty = true;
        });

        effect(() => {
            this.ai.provider();
            this.ai.apiKey();
            this.cachedModel = null;
            this.cachedProvider = '';
            this.cachedKey = '';
            this.index = [];
            this.dirty = true;
        });
    }

    get available(): boolean {
        return this.resolveModel() !== null;
    }

    private resolveModel(): ReturnType<ReturnType<typeof createOpenAI>['textEmbeddingModel']> | null {
        const provider = this.ai.provider();
        const key = this.ai.apiKey();

        if (this.cachedProvider === provider && this.cachedKey === key && this.cachedModel) {
            return this.cachedModel;
        }

        this.cachedProvider = provider;
        this.cachedKey = key;
        this.cachedModel = null;

        if (provider === 'openai' && key) {
            this.cachedModel = createOpenAI({ apiKey: key }).textEmbeddingModel('text-embedding-3-small');
        } else if (provider === 'gemini' && key) {
            this.cachedModel = createGoogleGenerativeAI({ apiKey: key }).textEmbeddingModel('text-embedding-004');
        } else if (provider === 'ollama') {
            this.cachedModel = createOpenAI({ apiKey: 'ollama', baseURL: 'http://localhost:11434/v1' }).textEmbeddingModel('nomic-embed-text');
        }

        return this.cachedModel;
    }

    private collectItems(): { text: string; result: SemanticResult }[] {
        const items: { text: string; result: SemanticResult }[] = [];

        this.store.notes().forEach(n => {
            items.push({
                text: [n.title, n.preview, ...(n.tags ?? [])].filter(Boolean).join(' '),
                result: {
                    id: n.id, type: 'note', title: n.title,
                    preview: n.preview || '', icon: 'edit_note', route: '/daily-notes',
                    tags: n.tags, date: n.lastEdited || n.date,
                },
            });
        });

        this.store.bookmarks().forEach(b => {
            items.push({
                text: [b.title, b.description, b.url, b.notes, ...(b.tags ?? [])].filter(Boolean).join(' '),
                result: {
                    id: b.id, type: 'bookmark', title: b.title,
                    preview: b.url, icon: 'bookmark', route: '/bookmarks', tags: b.tags,
                },
            });
        });

        this.store.tasks().forEach(t => {
            items.push({
                text: [t.title, t.description, t.notes, t.project, ...(t.labels ?? [])].filter(Boolean).join(' '),
                result: {
                    id: t.id, type: 'task', title: t.title,
                    preview: [t.project, t.priority].filter(Boolean).join(' · '),
                    icon: 'check_circle', route: '/tasks', date: t.due, badge: t.status,
                },
            });
        });

        this.store.books().forEach(n => {
            items.push({
                text: [n.title, ...n.genre].filter(Boolean).join(' '),
                result: {
                    id: n.id, type: 'book', title: n.title,
                    preview: n.genre.join(', '), icon: 'menu_book', route: '/write', badge: n.status,
                },
            });
        });

        return items;
    }

    private cosine(a: number[], b: number[]): number {
        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        const denom = Math.sqrt(magA) * Math.sqrt(magB);
        return denom === 0 ? 0 : dot / denom;
    }

    private async buildIndex(): Promise<void> {
        if (this.indexing) return;
        const model = this.resolveModel();
        if (!model) return;

        this.indexing = true;
        try {
            const items = this.collectItems();
            if (items.length === 0) {
                this.index = [];
                this.dirty = false;
                return;
            }
            const { embeddings } = await embedMany({ model, values: items.map(i => i.text) });
            this.index = items.map((item, i) => ({ result: item.result, vector: embeddings[i] }));
            this.dirty = false;
        } catch (e) {
            console.error('[SemanticSearch] indexing failed:', e);
        } finally {
            this.indexing = false;
        }
    }

    async search(query: string, k = 6): Promise<SemanticResult[]> {
        if (!query.trim()) return [];
        const model = this.resolveModel();
        if (!model) return [];

        if (this.dirty) await this.buildIndex();
        if (this.index.length === 0) return [];

        try {
            const { embeddings } = await embedMany({ model, values: [query] });
            const queryVector = embeddings[0];
            return this.index
                .map(entry => ({ result: entry.result, score: this.cosine(queryVector, entry.vector) }))
                .filter(({ score }) => score > 0.5)
                .sort((a, b) => b.score - a.score)
                .slice(0, k)
                .map(({ result }) => result);
        } catch (e) {
            console.error('[SemanticSearch] search failed:', e);
            return [];
        }
    }
}
