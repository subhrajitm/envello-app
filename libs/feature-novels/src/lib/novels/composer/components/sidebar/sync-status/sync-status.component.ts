import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-status.component.html',
  styleUrls: [
    './sync-status.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class SyncStatusComponent {
  wordCount = input.required<number>();
  formattedTime = input.required<string>();
  goalProgress = input<number | null>(null);
  leftSidebarCollapsed = input.required<boolean>();
  
  toggleSidebar = output<void>();
}
