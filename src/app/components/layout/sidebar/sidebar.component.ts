import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SidebarNavItem {
  id: string;
  icon: string;
  label: string;
  count?: number | string;
}

@Component({
  selector: 'env-left-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  /** Uppercase title, shown in the header */
  @Input() title = '';
  /** Small caption on the right, e.g. "4 tasks" */
  @Input() subtitle = '';

  /** Placeholder for the search input */
  @Input() searchPlaceholder = 'Search...';
  /** Current search text */
  @Input() searchQuery = '';
  /** Emit when search text changes */
  @Output() searchChange = new EventEmitter<string>();

  /** Primary nav items (Inbox, Today, etc.) */
  @Input() items: SidebarNavItem[] = [];
  /** Id of the currently selected item */
  @Input() activeId: string | null = null;
  /** Emit when the active nav item changes */
  @Output() activeIdChange = new EventEmitter<string>();

  /** Optional primary add button icon (e.g. "add") */
  @Input() addIcon: string | null = null;
  /** Tooltip for the add button */
  @Input() addTooltip = 'Add';
  /** Fired when the add button is clicked */
  @Output() addClicked = new EventEmitter<void>();

  /** Optional projected footer area */
  @Input() showFooter = false;

  onSearchInput(value: string) {
    this.searchChange.emit(value);
  }

  onSelectItem(id: string) {
    this.activeIdChange.emit(id);
  }

  onAddClick() {
    this.addClicked.emit();
  }
}
