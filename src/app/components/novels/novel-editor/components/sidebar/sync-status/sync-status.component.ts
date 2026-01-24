import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-status.component.html',
  styleUrl: './sync-status.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncStatusComponent {
  wordCount = input.required<number>();
  formattedTime = input.required<string>();
  goalProgress = input<number | null>(null);
  leftSidebarCollapsed = input.required<boolean>();
  
  toggleSidebar = output<void>();
}
