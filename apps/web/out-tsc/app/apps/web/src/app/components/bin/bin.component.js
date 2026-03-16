import { __decorate } from 'tslib';
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BinService } from '@envello/core';
import { ButtonComponent, EmptyStateComponent } from '@envello/ui';
let BinComponent = class BinComponent {
  binService = inject(BinService);
  items = this.binService.items;
  // Sorted newest → oldest for an enterprise-style view
  sortedItems = computed(() =>
    [...this.items()].sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
    ),
  );
  trackById(index, item) {
    return item.id;
  }
  formatType(type) {
    switch (type) {
      case 'daily-note':
        return 'Daily Note';
      case 'novel-chapter':
        return 'Novel Chapter';
      case 'novel-note':
        return 'Novel Note';
      case 'novel-character':
        return 'Character';
      case 'novel-location':
        return 'Location';
      default:
        return type;
    }
  }
  permanentlyDelete(id) {
    const confirmed = confirm(
      'Delete forever?\n\nThis will permanently remove the selected item from the Bin and it cannot be recovered.',
    );
    if (confirmed) {
      this.binService.permanentlyDelete(id);
    }
  }
  emptyBin() {
    if (this.items().length === 0) {
      return;
    }
    const confirmed = confirm(
      'Empty Bin?\n\nThis will permanently remove all items from the Bin for this workspace. This action cannot be undone.',
    );
    if (confirmed) {
      this.binService.emptyBin();
    }
  }
};
BinComponent = __decorate(
  [
    Component({
      selector: 'app-bin',
      standalone: true,
      imports: [CommonModule, ButtonComponent, EmptyStateComponent],
      templateUrl: './bin.component.html',
      styleUrl: './bin.component.css',
    }),
  ],
  BinComponent,
);
export { BinComponent };
