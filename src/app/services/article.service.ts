import { Injectable, signal, inject } from '@angular/core';
import { RxDBService } from '../core/services/rxdb.service';

export interface Article {
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
}

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private rxdb = inject(RxDBService);

  articles = signal<Article[]>([]);

  constructor() {
    this.loadFromRxDB();
  }

  private async loadFromRxDB(): Promise<void> {
    try {
      const list = await this.rxdb.getAllArticles();
      this.articles.set(list);
    } catch (e) {
      console.error('[ArticleService] loadFromRxDB failed', e);
    }
  }

  getArticles() {
    return this.articles.asReadonly();
  }

  getArticle(id: string): Article | undefined {
    return this.articles().find(a => a.id === id);
  }

  addArticle(article: Omit<Article, 'id' | 'createdDate' | 'lastUpdated'>): Article {
    const newArticle: Article = {
      ...article,
      id: crypto.randomUUID(),
      createdDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    this.articles.update(list => [newArticle, ...list]);
    this.rxdb.upsertArticle(newArticle).catch(e => console.error('[ArticleService] persist failed', e));
    return newArticle;
  }

  updateArticle(id: string, updates: Partial<Article>): void {
    this.articles.update(list =>
      list.map(a => a.id === id ? { ...a, ...updates, lastUpdated: new Date().toISOString() } : a)
    );
    const a = this.articles().find(x => x.id === id);
    if (a) this.rxdb.upsertArticle(a).catch(e => console.error('[ArticleService] persist failed', e));
  }

  deleteArticle(id: string): void {
    this.articles.update(list => list.filter(a => a.id !== id));
    this.rxdb.removeArticle(id).catch(e => console.error('[ArticleService] remove failed', e));
  }

  getArticlesByPlatform(platform: string): Article[] {
    if (platform === 'All Platforms') return this.articles();
    return this.articles().filter(a => a.platform === platform);
  }

  getArticlesByPipeline(pipeline: string): Article[] {
    if (pipeline === 'All Statuses') return this.articles();
    return this.articles().filter(a => a.pipeline === pipeline);
  }

  searchArticles(query: string): Article[] {
    if (!query.trim()) return this.articles();
    const lowerQuery = query.toLowerCase();
    return this.articles().filter(a =>
      a.title.toLowerCase().includes(lowerQuery) ||
      a.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      a.excerpt?.toLowerCase().includes(lowerQuery)
    );
  }
}
