import { Component, input, output, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionHistoryService, VersionSnapshot } from '@envello/core';

@Component({
  selector: 'app-version-history-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-history-modal.component.html',
  styleUrls: [
    './version-history-modal.component.css',
    '../../../novel-editor.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class VersionHistoryModalComponent {
  isOpen = input.required<boolean>();
  versions = input.required<VersionSnapshot[]>();
  
  restore = output<string>();
  close = output<void>();
  
  protected versionHistoryService = inject(VersionHistoryService);
}
