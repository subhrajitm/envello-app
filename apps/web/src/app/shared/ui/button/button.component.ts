import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'env-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() icon?: string;
  @Input() iconPos: 'left' | 'right' = 'left';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  clicked = output<void>();

  onClick() {
    if (!this.disabled) this.clicked.emit();
  }
}
