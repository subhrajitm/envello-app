import { Component, Input } from '@angular/core';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'accent'
  | 'info'
  | 'purple';

export type BadgeSize = 'xs' | 'sm' | 'md';

@Component({
  selector: 'env-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.css',
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'default';
  @Input() size: BadgeSize = 'sm';
  /** Fully-rounded pill shape */
  @Input() pill = false;
  /** Custom CSS color — applied via color-mix tinting (overrides variant colors) */
  @Input() customColor = '';
}
