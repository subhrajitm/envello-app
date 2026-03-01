import { __decorate } from "tslib";
import { logIfTauri } from '../utils/tauri-helpers';
import { Injectable, signal, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { FileSystemService } from './file-system.service';
import { StoreService } from './store.service';
let ArticleService = class ArticleService {
    db = inject(DataService);
    fs = inject(FileSystemService);
    store = inject(StoreService);
    articles = signal([]);
    turndownService;
    saveTimeouts = {};
    constructor() {
        this.loadFromDb();
        this.initMarkdown();
    }
    async initMarkdown() {
        if (typeof window !== 'undefined') {
            const TurndownService = (await import('turndown')).default;
            this.turndownService = new TurndownService();
        }
    }
    async loadFromDb() {
        try {
            const list = await this.db.getAll('articles');
            this.articles.set(list);
        }
        catch (e) {
            if (typeof window !== 'undefined' && '__TAURI__' in window) {
                logIfTauri('[ArticleService] loadFromDb failed', e);
            }
        }
    }
    async loadArticleContent(id) {
        const article = this.articles().find(a => a.id === id);
        if (!article)
            return '';
        if (article.content && article.content.length > 20)
            return article.content;
        let mdContent = await this.fs.readFile('articles', id);
        if (mdContent === null && article.content && article.content.length > 0) {
            console.log('[ArticleService] Migrating article to file:', id);
            await this.saveArticleContentToFile(id, article.content);
            return article.content;
        }
        if (mdContent) {
            const { marked } = await import('marked');
            const html = await marked.parse(mdContent);
            this.articles.update(as => as.map(a => a.id === id ? { ...a, content: html } : a));
            return html;
        }
        return '';
    }
    getArticles() {
        return this.articles.asReadonly();
    }
    getArticle(id) {
        return this.articles().find(a => a.id === id);
    }
    addArticle(article) {
        const newArticle = {
            ...article,
            id: crypto.randomUUID(),
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };
        this.articles.update(list => [newArticle, ...list]);
        // Auto-create Project
        const projectId = crypto.randomUUID();
        this.store.addProject({
            id: projectId,
            title: newArticle.title,
            description: 'Article Project: ' + newArticle.platform,
            status: 'PLANNING',
            words: String(newArticle.wordCount),
            updated: new Date().toISOString(),
            icon: 'article',
            linkedResources: {
                articles: [newArticle.id]
            }
        });
        // Initial file write
        this.saveArticleContentToFile(newArticle.id, newArticle.content || '');
        this.db.upsert('articles', newArticle).catch(e => logIfTauri('[ArticleService] persist failed', e));
        return newArticle;
    }
    updateArticle(id, updates) {
        const article = this.getArticle(id);
        if (!article)
            return;
        this.articles.update(list => list.map(a => a.id === id ? { ...a, ...updates, lastUpdated: new Date().toISOString() } : a));
        if (updates.content !== undefined) {
            if (this.saveTimeouts[id])
                clearTimeout(this.saveTimeouts[id]);
            this.saveTimeouts[id] = setTimeout(() => {
                this.saveArticleContentToFile(id, updates.content || '');
            }, 1000);
        }
        const a = this.articles().find(x => x.id === id);
        if (a)
            this.db.upsert('articles', a).catch(e => logIfTauri('[ArticleService] persist failed', e));
    }
    async saveArticleContentToFile(id, html) {
        if (!this.turndownService)
            await this.initMarkdown();
        if (!this.turndownService)
            return;
        const md = this.turndownService.turndown(html);
        const filePath = await this.fs.saveFile('articles', id, md);
        const article = this.articles().find(a => a.id === id);
        if (article && article.filePath !== filePath) {
            this.articles.update(as => as.map(a => a.id === id ? { ...a, filePath } : a));
            this.db.upsert('articles', { ...article, filePath });
        }
    }
    deleteArticle(id) {
        this.articles.update(list => list.filter(a => a.id !== id));
        this.db.remove('articles', id).catch(e => logIfTauri('[ArticleService] remove failed', e));
        this.fs.deleteFile('articles', id).catch(e => console.error('Failed to delete article file', e));
    }
    getArticlesByPlatform(platform) {
        if (platform === 'All Platforms')
            return this.articles();
        return this.articles().filter(a => a.platform === platform);
    }
    getArticlesByPipeline(pipeline) {
        if (pipeline === 'All Statuses')
            return this.articles();
        return this.articles().filter(a => a.pipeline === pipeline);
    }
    searchArticles(query) {
        if (!query.trim())
            return this.articles();
        const lowerQuery = query.toLowerCase();
        return this.articles().filter(a => a.title.toLowerCase().includes(lowerQuery) ||
            a.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            a.excerpt?.toLowerCase().includes(lowerQuery));
    }
};
ArticleService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], ArticleService);
export { ArticleService };
