import { __decorate } from 'tslib';
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
let LinkModalComponent = class LinkModalComponent {
  isOpen = input.required();
  linkText = input.required();
  linkUrl = input.required();
  linkTextChange = output();
  linkUrlChange = output();
  insert = output();
  cancel = output();
  onInsert() {
    if (this.linkUrl().trim()) {
      this.insert.emit();
    }
  }
  onCancel() {
    this.cancel.emit();
  }
};
LinkModalComponent = __decorate(
  [
    Component({
      selector: 'app-link-modal',
      standalone: true,
      imports: [CommonModule, FormsModule],
      templateUrl: './link-modal.component.html',
      styleUrls: [
        './link-modal.component.css',
        '../../../novel-editor.component.css',
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
    }),
  ],
  LinkModalComponent,
);
export { LinkModalComponent };
