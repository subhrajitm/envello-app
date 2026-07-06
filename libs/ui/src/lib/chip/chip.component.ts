import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ChipVariant = 'default' | 'accent' | 'success' | 'danger';
export type ChipSize = 'sm' | 'md';

@Component({
  selector: 'env-chip',
  standalone: true,
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.css',
})
export class ChipComponent {
  @Input() variant: ChipVariant = 'default';
  @Input() size: ChipSize = 'sm';
  /** Marks chip as selected/active (visual only — parent handles toggle logic via button wrapper) */
  @Input() active = false;
  /** Shows a remove × button */
  @Input() removable = false;
  /** Material Symbols icon name shown before content */
  @Input() icon = '';
  /** Custom CSS color for dynamic coloring */
  @Input() customColor = '';

  @Output() removed = new EventEmitter<void>();

  onRemove(e: MouseEvent): void {
    e.stopPropagation();
    this.removed.emit();
  }
}
