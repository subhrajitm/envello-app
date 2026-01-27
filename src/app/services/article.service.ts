import { Injectable, signal } from '@angular/core';

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
  articles = signal<Article[]>([
    {
      id: '1',
      title: 'Scaling Enterprise SaaS: The 2024 Architecture Guide',
      platform: 'Medium',
      pipeline: 'PUBLISHED',
      wordCount: 2450,
      content: 'Full article content here...',
      url: 'https://medium.com/@user/scaling-enterprise-saas',
      engagement: { views: '12.4k', comments: '842', likes: '1.2k' },
      tags: ['SaaS', 'Architecture', 'Enterprise'],
      lastUpdated: '2023-10-28T14:02:00',
      createdDate: '2023-10-25T10:00:00',
      icon: 'description',
      excerpt: 'A comprehensive guide to scaling enterprise SaaS applications in 2024...'
    },
    {
      id: '2',
      title: 'The Future of Remote-First Management Styles',
      platform: 'Substack',
      pipeline: 'DRAFT',
      wordCount: 1120,
      content: 'Draft content...',
      tags: ['Management', 'Remote Work'],
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdDate: '2023-10-27T08:00:00',
      icon: 'edit',
      excerpt: 'Exploring new management approaches for distributed teams...'
    },
    {
      id: '3',
      title: 'Why "Nano Banana" Aesthetic is Taking Over UX Design',
      platform: 'Blog',
      pipeline: 'REVIEW',
      wordCount: 850,
      content: 'Review content...',
      tags: ['UX', 'Design', 'Trends'],
      lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      createdDate: '2023-10-26T18:45:00',
      icon: 'chat_bubble',
      excerpt: 'A deep dive into the latest UX design trends...'
    },
    {
      id: '4',
      title: 'Monthly Roundup: October Tech Innovations',
      platform: 'Medium',
      pipeline: 'SCHEDULED',
      wordCount: 3100,
      content: 'Scheduled content...',
      scheduledDate: '2023-11-01T09:00:00',
      engagement: { views: 'Pending', comments: '' },
      tags: ['Tech', 'Innovation', 'Roundup'],
      lastUpdated: '2023-10-26T09:15:00',
      createdDate: '2023-10-20T10:00:00',
      icon: 'calendar_today',
      excerpt: 'A comprehensive look at the tech innovations from October...'
    },
    {
      id: '5',
      title: 'The Rise of the Project Manager Creator',
      platform: 'Substack',
      pipeline: 'PUBLISHED',
      wordCount: 1820,
      content: 'Published content...',
      url: 'https://substack.com/@user/project-manager-creator',
      engagement: { views: '3.1k', comments: '112', likes: '245' },
      tags: ['Project Management', 'Creator Economy'],
      lastUpdated: '2023-10-22T21:30:00',
      createdDate: '2023-10-18T14:00:00',
      icon: 'description',
      excerpt: 'How project managers are becoming content creators...'
    },
  ]);

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
    return newArticle;
  }

  updateArticle(id: string, updates: Partial<Article>): void {
    this.articles.update(list =>
      list.map(a => a.id === id ? { ...a, ...updates, lastUpdated: new Date().toISOString() } : a)
    );
  }

  deleteArticle(id: string): void {
    this.articles.update(list => list.filter(a => a.id !== id));
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
