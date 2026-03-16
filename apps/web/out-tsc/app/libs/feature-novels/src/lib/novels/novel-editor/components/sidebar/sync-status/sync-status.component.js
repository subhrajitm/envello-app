import { __decorate } from 'tslib';
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
let SyncStatusComponent = class SyncStatusComponent {
  wordCount = input.required();
  formattedTime = input.required();
  goalProgress = input(null);
  leftSidebarCollapsed = input.required();
  toggleSidebar = output();
};
SyncStatusComponent = __decorate(
  [
    Component({
      selector: 'app-sync-status',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './sync-status.component.html',
      styleUrls: [
        './sync-status.component.css',
        '../../../novel-editor.component.css',
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
    }),
  ],
  SyncStatusComponent,
);
export { SyncStatusComponent };
