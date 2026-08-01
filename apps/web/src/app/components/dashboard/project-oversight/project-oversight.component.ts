import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent, BadgeVariant } from '@envello/ui';
import { StoreService } from '@envello/core';

@Component({
  selector: 'app-project-oversight',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  templateUrl: './project-oversight.component.html',
  styleUrl: './project-oversight.component.css'
})
export class ProjectOversightComponent {
  private readonly store = inject(StoreService);

  projects = computed(() =>
    this.store.books()
      .slice()
      .sort((a, b) => (b.lastUpdated ?? '').localeCompare(a.lastUpdated ?? ''))
      .slice(0, 8)
      .map(b => ({
        id: b.id,
        title: b.title,
        status: b.status as 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED',
        words: this.formatWords(b.wordCount ?? 0),
        updated: this.timeAgo(b.lastUpdated),
        icon: b.icon ?? 'menu_book',
      }))
  );

  getStatusVariant(status: string): BadgeVariant {
    switch (status) {
      case 'DRAFTING':  return 'warning';
      case 'PLANNING':  return 'info';
      case 'REVISING':  return 'accent';
      case 'PUBLISHED': return 'success';
      default:          return 'default';
    }
  }

  private formatWords(count: number): string {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1) + 'k';
    return count.toString();
  }

  private timeAgo(iso: string | undefined): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
