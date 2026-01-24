import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionHistoryService, VersionSnapshot } from '../../../../../services/version-history.service';

@Component({
  selector: 'app-version-history-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-history-modal.component.html',
  styleUrl: './version-history-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VersionHistoryModalComponent {
  isOpen = input.required<boolean>();
  versions = input.required<VersionSnapshot[]>();
  
  restore = output<string>();
  close = output<void>();
  
  versionHistoryService = inject(VersionHistoryService);
}
