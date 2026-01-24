import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-link-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './link-modal.component.html',
  styleUrl: './link-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkModalComponent {
  isOpen = input.required<boolean>();
  linkText = input.required<string>();
  linkUrl = input.required<string>();
  
  linkTextChange = output<string>();
  linkUrlChange = output<string>();
  insert = output<void>();
  cancel = output<void>();

  onInsert() {
    if (this.linkUrl().trim()) {
      this.insert.emit();
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
