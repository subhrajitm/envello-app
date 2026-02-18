import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArticlesComponent } from './articles.component';
import { ArticleService } from '@envello/core';

describe('ArticlesComponent', () => {
  let component: ArticlesComponent;
  let fixture: ComponentFixture<ArticlesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticlesComponent],
      providers: [ArticleService],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticlesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default filters', () => {
    expect(component.selectedPlatform()).toBe('All Platforms');
    expect(component.selectedPipeline()).toBe('All Statuses');
  });

  it('should open and close article modal', () => {
    expect(component.showArticleModal()).toBe(false);
    component.openArticleModal();
    expect(component.showArticleModal()).toBe(true);
    component.closeArticleModal();
    expect(component.showArticleModal()).toBe(false);
  });

  it('should open article modal with article for edit', () => {
    const article = component.articles()[0];
    component.openArticleModal(article);
    expect(component.showArticleModal()).toBe(true);
    expect(component.editingArticle()).toEqual(article);
    expect(component.newArticleTitle()).toBe(article.title);
  });

  it('should set active article and clear it', () => {
    const article = component.articles()[0];
    component.openArticle(article);
    expect(component.activeArticleId()).toBe(article.id);
    component.closeArticle();
    expect(component.activeArticleId()).toBeNull();
  });

  it('should return pipeline color', () => {
    expect(component.getPipelineColor('PUBLISHED')).toBe('pipeline-green');
    expect(component.getPipelineColor('DRAFT')).toBe('pipeline-yellow');
    expect(component.getPipelineColor('REVIEW')).toBe('pipeline-blue');
  });

  it('should format word count', () => {
    expect(component.formatWordCount(1500)).toBe('1,500');
  });

  it('should have stats computed from articles', () => {
    const stats = component.stats();
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(stats.published).toBeGreaterThanOrEqual(0);
    expect(stats.draft).toBeGreaterThanOrEqual(0);
  });
});
