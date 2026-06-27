import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'env-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = '';
  @Input() description = '';
  @Input() compact = false;
  @Input() ctaLabel = '';
  @Input() ctaIcon = '';
  @Input() secondaryCtaLabel = '';
  @Input() hint = '';
  @Output() ctaClicked = new EventEmitter<void>();
  @Output() secondaryCtaClicked = new EventEmitter<void>();
}
