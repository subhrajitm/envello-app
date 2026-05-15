import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

export interface FeatureSidebarNavItem {
  id: string;
  label: string;
  icon?: string;
  iconColor?: string;
  dotColor?: string;
  count?: number;
}

@Component({
  selector: 'env-feature-sidebar',
  standalone: true,
  imports: [],
  templateUrl: './feature-sidebar.component.html',
  styleUrl: './feature-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureSidebarComponent {
  @Input() title = '';
  @Input() navItems: FeatureSidebarNavItem[] = [];
  @Input() activeNavId = '';

  @Output() navItemClick = new EventEmitter<string>();
}
