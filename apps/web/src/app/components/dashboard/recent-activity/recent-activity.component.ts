import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService } from '@envello/core';

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activity.component.html',
  styleUrl: './recent-activity.component.css',
})
export class RecentActivityComponent {
  private store = inject(StoreService);

  activities = computed(() => {
    return this.store
      .activities()
      .map((activity) => ({
        id: activity.id,
        action: activity.text,
        time: activity.time,
        icon: this.getIconForType(activity.type),
      }))
      .slice(0, 5);
  });

  private router = inject(Router);

  viewAll() {
    this.router.navigate(['/activity-log']);
  }

  private getIconForType(type: string): string {
    switch (type) {
      case 'entry':
        return 'edit_note';
      case 'sync':
        return 'cloud_sync';
      case 'ai':
        return 'smart_toy';
      case 'system':
        return 'settings';
      default:
        return 'info';
    }
  }
}
