import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconButtonComponent } from '../icon-button/icon-button.component';

@Component({
  selector: 'env-modal',
  standalone: true,
  imports: [CommonModule, IconButtonComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'large' | 'xl' = 'md';
  @Input() showClose = true;
  @Input() noBodyScroll = false;

  closed = output<void>();

  onOverlayClick() {
    this.closed.emit();
  }

  onContainerClick(e: Event) {
    e.stopPropagation();
  }

  onClose() {
    this.closed.emit();
  }
}
