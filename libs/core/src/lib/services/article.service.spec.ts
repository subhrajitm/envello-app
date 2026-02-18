import { TestBed } from '@angular/core/testing';
import { ArticleService } from './article.service';

describe('ArticleService', () => {
  let service: ArticleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArticleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return articles from getArticles', () => {
    const articles = service.getArticles()();
    expect(articles.length).toBeGreaterThan(0);
  });

  it('should get article by id', () => {
    const articles = service.getArticles()();
    const first = articles[0];
    expect(service.getArticle(first.id)).toEqual(first);
  });

  it('should add article', () => {
    const before = service.getArticles()().length;
    service.addArticle({
      title: 'Test Article',
      platform: 'Medium',
      pipeline: 'DRAFT',
      wordCount: 100,
      tags: ['test'],
      icon: 'article',
      excerpt: 'Test excerpt',
    });
    expect(service.getArticles()().length).toBe(before + 1);
  });

  it('should update article', () => {
    const articles = service.getArticles()();
    const id = articles[0].id;
    service.updateArticle(id, { title: 'Updated Title' });
    expect(service.getArticle(id)?.title).toBe('Updated Title');
  });

  it('should delete article', () => {
    const before = service.getArticles()().length;
    const id = service.getArticles()()[0].id;
    service.deleteArticle(id);
    expect(service.getArticles()().length).toBe(before - 1);
    expect(service.getArticle(id)).toBeUndefined();
  });
});
