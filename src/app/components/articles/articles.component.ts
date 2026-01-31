import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ArticleService, Article } from '../../services/article.service';
import { ButtonComponent, ModalComponent, EmptyStateComponent, IconButtonComponent } from '../../shared/ui';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    ModalComponent,
    EmptyStateComponent,
    IconButtonComponent
  ],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.css'
})
export class ArticlesComponent {
  articleService = inject(ArticleService);

  // State
  articles = this.articleService.getArticles();
  selectedPlatform = signal<string>('All Platforms');
  selectedPipeline = signal<string>('All Statuses');
  searchQuery = signal<string>('');
  activeArticleId = signal<string | null>(null);
  showArticleModal = signal(false);
  showDeleteModal = signal(false);
  editingArticle = signal<Article | null>(null);
  articleToDelete = signal<Article | null>(null);

  // Form inputs
  newArticleTitle = signal('');
  newArticlePlatform = signal<Article['platform']>('Medium');
  newArticlePipeline = signal<Article['pipeline']>('DRAFT');
  newArticleContent = signal('');
  newArticleTags = signal('');
  newArticleUrl = signal('');
  newArticleScheduledDate = signal('');
  editNotes = signal('');

  // Computed
  filteredArticles = computed(() => {
    let list = this.articles();

    // Filter by platform
    if (this.selectedPlatform() !== 'All Platforms') {
      list = list.filter(a => a.platform === this.selectedPlatform());
    }

    // Filter by pipeline
    if (this.selectedPipeline() !== 'All Statuses') {
      list = list.filter(a => a.pipeline === this.selectedPipeline());
    }

    // Search
    if (this.searchQuery().trim()) {
      const query = this.searchQuery().toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.tags.some(tag => tag.toLowerCase().includes(query)) ||
        a.excerpt?.toLowerCase().includes(query)
      );
    }

    return list;
  });

  activeArticle = computed(() => {
    const id = this.activeArticleId();
    return id ? this.articleService.getArticle(id) : null;
  });

  stats = computed(() => {
    const list = this.articles();
    return {
      total: list.length,
      published: list.filter(a => a.pipeline === 'PUBLISHED').length,
      draft: list.filter(a => a.pipeline === 'DRAFT').length,
      review: list.filter(a => a.pipeline === 'REVIEW').length,
      scheduled: list.filter(a => a.pipeline === 'SCHEDULED').length,
    };
  });

  platforms = ['All Platforms', 'Medium', 'Substack', 'Blog', 'Dev.to', 'Hashnode', 'Custom'] as const;
  pipelines = ['All Statuses', 'PUBLISHED', 'DRAFT', 'REVIEW', 'SCHEDULED'] as const;

  // Methods
  async openArticleModal(article?: Article) {
    if (article) {
      this.editingArticle.set(article);
      this.newArticleTitle.set(article.title);
      this.newArticlePlatform.set(article.platform);
      this.newArticlePipeline.set(article.pipeline);
      // Load content asynchronously
      const content = await this.articleService.loadArticleContent(article.id);
      this.newArticleContent.set(content || '');

      this.newArticleTags.set(article.tags.join(', '));
      this.newArticleUrl.set(article.url || '');
      this.newArticleScheduledDate.set(article.scheduledDate || '');
      this.editNotes.set('');
    } else {
      this.editingArticle.set(null);
      this.newArticleTitle.set('');
      this.newArticlePlatform.set('Medium');
      this.newArticlePipeline.set('DRAFT');
      this.newArticleContent.set('');
      this.newArticleTags.set('');
      this.newArticleUrl.set('');
      this.newArticleScheduledDate.set('');
    }
    this.showArticleModal.set(true);
  }

  closeArticleModal() {
    this.showArticleModal.set(false);
    this.editingArticle.set(null);
  }

  saveArticle() {
    if (!this.newArticleTitle().trim()) return;

    const tags = this.newArticleTags().split(',').map(t => t.trim()).filter(t => t);
    const wordCount = this.newArticleContent().split(/\s+/).filter(w => w).length;

    const articleData: Omit<Article, 'id' | 'createdDate' | 'lastUpdated'> = {
      title: this.newArticleTitle(),
      platform: this.newArticlePlatform(),
      pipeline: this.newArticlePipeline(),
      wordCount,
      content: this.newArticleContent(),
      tags,
      url: this.newArticleUrl() || undefined,
      scheduledDate: this.newArticleScheduledDate() || undefined,
      icon: this.getIconForPipeline(this.newArticlePipeline()),
      excerpt: this.newArticleContent().substring(0, 150) + '...',
    };

    if (this.editingArticle()) {
      this.articleService.updateArticle(this.editingArticle()!.id, articleData);
    } else {
      this.articleService.addArticle(articleData);
    }

    this.closeArticleModal();
  }

  openArticle(article: Article) {
    this.activeArticleId.set(article.id);
    this.articleService.loadArticleContent(article.id);
  }

  closeArticle() {
    this.activeArticleId.set(null);
  }

  requestDelete(article: Article, event?: Event) {
    if (event) event.stopPropagation();
    this.articleToDelete.set(article);
    this.showDeleteModal.set(true);
  }

  confirmDelete() {
    const article = this.articleToDelete();
    if (article) {
      this.articleService.deleteArticle(article.id);
      if (this.activeArticleId() === article.id) {
        this.closeArticle();
      }
      this.showDeleteModal.set(false);
      this.articleToDelete.set(null);
    }
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.articleToDelete.set(null);
  }

  getPipelineColor(pipeline: string): string {
    switch (pipeline) {
      case 'PUBLISHED': return 'pipeline-green';
      case 'DRAFT': return 'pipeline-yellow';
      case 'REVIEW': return 'pipeline-blue';
      case 'SCHEDULED': return 'pipeline-orange';
      default: return 'pipeline-gray';
    }
  }

  getIconForPipeline(pipeline: Article['pipeline']): string {
    switch (pipeline) {
      case 'PUBLISHED': return 'description';
      case 'DRAFT': return 'edit';
      case 'REVIEW': return 'chat_bubble';
      case 'SCHEDULED': return 'calendar_today';
      default: return 'article';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday, ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatWordCount(count: number): string {
    return count.toLocaleString();
  }
}
