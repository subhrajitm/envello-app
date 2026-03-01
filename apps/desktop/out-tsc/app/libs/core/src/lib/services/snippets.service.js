import { __decorate } from "tslib";
import { logIfTauri } from '../utils/tauri-helpers';
import { Injectable, inject, signal, computed } from '@angular/core';
import { BinService } from './bin.service';
import { DataService } from '@envello/data';
import { StoreService } from './store.service';
const LANGS = ['Python', 'JavaScript', 'TypeScript', 'Markdown', 'SQL', 'HTML', 'CSS', 'JSON', 'Shell', 'Other'];
let SnippetsService = class SnippetsService {
    bin = inject(BinService);
    db = inject(DataService);
    store = inject(StoreService);
    snippets = signal([]);
    selectedSnippetId = signal(null);
    viewFilter = signal('all');
    viewMode = signal('list');
    sortBy = signal('lastModified');
    sortDirection = signal('desc');
    searchQuery = signal('');
    selectedLang = signal('');
    selectedTag = signal('');
    LANGS = LANGS;
    constructor() {
        this.loadFromDb();
    }
    async loadFromDb() {
        try {
            const list = await this.db.getAll('snippets');
            this.snippets.set(list);
        }
        catch (e) {
            logIfTauri('[SnippetsService] loadFromDb failed', e);
        }
    }
    selectedSnippet = computed(() => {
        const id = this.selectedSnippetId();
        return id ? this.snippets().find(s => s.id === id) ?? null : null;
    });
    allTags = computed(() => {
        const set = new Set();
        this.snippets().forEach(s => s.tags.forEach(t => set.add(t)));
        return Array.from(set).sort();
    });
    filteredSnippets = computed(() => {
        let list = [...this.snippets()];
        const filter = this.viewFilter();
        if (filter !== 'all')
            list = list.filter(s => s.lang === filter);
        const lang = this.selectedLang();
        if (lang)
            list = list.filter(s => s.lang === lang);
        const tag = this.selectedTag();
        if (tag)
            list = list.filter(s => s.tags.includes(tag));
        const q = this.searchQuery().toLowerCase().trim();
        if (q) {
            list = list.filter(s => s.title.toLowerCase().includes(q) ||
                s.content.toLowerCase().includes(q) ||
                s.path.toLowerCase().includes(q) ||
                s.creator.toLowerCase().includes(q) ||
                s.tags.some(t => t.toLowerCase().includes(q)));
        }
        const field = this.sortBy();
        const dir = this.sortDirection();
        list.sort((a, b) => {
            let cmp = 0;
            switch (field) {
                case 'title':
                    cmp = a.title.localeCompare(b.title);
                    break;
                case 'lastModified':
                    cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                    break;
                case 'lang':
                    cmp = a.lang.localeCompare(b.lang);
                    break;
                case 'path':
                    cmp = a.path.localeCompare(b.path);
                    break;
            }
            return dir === 'asc' ? cmp : -cmp;
        });
        return list;
    });
    stats = computed(() => {
        const all = this.snippets();
        const byLang = new Map();
        all.forEach(s => byLang.set(s.lang, (byLang.get(s.lang) ?? 0) + 1));
        return { total: all.length, byLang: Object.fromEntries(byLang) };
    });
    snippetsByLang = computed(() => {
        const map = new Map();
        this.snippets().forEach(s => map.set(s.lang, (map.get(s.lang) ?? 0) + 1));
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    });
    addSnippet(snippet) {
        const now = new Date().toISOString();
        const created = {
            ...snippet,
            id: `snip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            createdAt: now,
            updatedAt: now,
        };
        this.snippets.update(list => [...list, created]);
        this.db.upsert('snippets', created).catch(e => logIfTauri('[SnippetsService] persist failed', e));
        // Auto-create Project
        const projectId = crypto.randomUUID();
        this.store.addProject({
            id: projectId,
            title: created.title,
            description: 'Snippet Project: ' + created.lang,
            status: 'PLANNING',
            words: '0',
            updated: now,
            icon: 'code',
            linkedResources: {
                snippets: [created.id]
            }
        });
        return created;
    }
    updateSnippet(id, patch) {
        const now = new Date().toISOString();
        this.snippets.update(list => list.map(s => (s.id === id ? { ...s, ...patch, updatedAt: now } : s)));
        const updated = this.snippets().find(s => s.id === id);
        if (updated)
            this.db.upsert('snippets', updated).catch(e => logIfTauri('[SnippetsService] persist failed', e));
    }
    deleteSnippet(id) {
        const s = this.snippets().find(x => x.id === id);
        if (!s)
            return;
        this.bin.addToBin({ type: 'snippet', originalId: id, title: s.title, payload: s });
        this.snippets.update(list => list.filter(x => x.id !== id));
        if (this.selectedSnippetId() === id)
            this.selectedSnippetId.set(null);
        this.db.remove('snippets', id).catch(e => logIfTauri('[SnippetsService] remove failed', e));
    }
    copyContent(id) {
        const s = this.snippets().find(x => x.id === id);
        return s ? s.content : null;
    }
};
SnippetsService = __decorate([
    Injectable({ providedIn: 'root' })
], SnippetsService);
export { SnippetsService };
