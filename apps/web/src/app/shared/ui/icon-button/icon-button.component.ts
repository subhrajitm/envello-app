import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconButtonVariant = 'primary' | 'ghost' | 'danger';

@Component({
  selector: 'env-icon-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './icon-button.component.html',
  styleUrl: './icon-button.component.css',
})
export class IconButtonComponent {
  @Input() icon = 'add';
  @Input() variant: IconButtonVariant = 'ghost';
  @Input() size: 28 | 32 = 32;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() active = false;
  @Input() title = '';

  clicked = output<void>();

  onClick() {
    if (!this.disabled) this.clicked.emit();
  }
}
