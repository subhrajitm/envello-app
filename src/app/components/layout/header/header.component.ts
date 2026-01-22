import { Component, Input, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../../services/theme.service';
import { NotificationService } from '../../../services/notification.service';
import { Router } from '@angular/router';
import { QuickFindComponent } from '../../quick-find/quick-find.component';
import { AddNewModalComponent } from '../../add-new-modal/add-new-modal.component';
import { SettingsModalComponent } from '../../settings-modal/settings-modal.component';
import { NotificationCenterComponent } from '../../notification-center/notification-center.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, QuickFindComponent, AddNewModalComponent, SettingsModalComponent, NotificationCenterComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Input() activeTab = 'Overview';
  @ViewChild(QuickFindComponent) quickFind?: QuickFindComponent;
  @ViewChild(AddNewModalComponent) addNewModal?: AddNewModalComponent;
  @ViewChild(SettingsModalComponent) settingsModal?: SettingsModalComponent;
  @ViewChild(NotificationCenterComponent) notificationCenter?: NotificationCenterComponent;

  themeService = inject(ThemeService);
  notificationService = inject(NotificationService);
  private router = inject(Router);

  // Expose unread count for template
  unreadCount = this.notificationService.unreadCount;

  tabs = [
    'Overview',
    'Daily Notes',
    'Novels/Fiction',
    'Journals',
    'Research',
    'Articles/Blogs',
    'Meetings',
    'Tasks/Todos',
    'Books/Reading',
    'Code Snippets',
    'Brainstorming',
  ];

  get theme(): Theme {
    return this.themeService.theme();
  }

  getThemeIcon(): string {
    const theme = this.theme;
    if (theme === 'dark') return 'dark_mode';
    if (theme === 'light') return 'light_mode';
    return 'palette'; // colorful theme
  }

  getNextTheme(): string {
    const theme = this.theme;
    if (theme === 'dark') return 'Light';
    if (theme === 'light') return 'Colorful';
    return 'Dark';
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  navigateTo(tab: string) {
    // Map tab name back to route path
    const map: Record<string, string> = {
      'Overview': 'overview',
      'Novels/Fiction': 'novels',
      'Research': 'research',
      'Articles/Blogs': 'articles',
      'Journals': 'journals',
      'Daily Notes': 'daily-notes',
      'Tasks/Todos': 'tasks',
      'Meetings': 'meetings',
      'Books/Reading': 'books',
      'Code Snippets': 'snippets',
      'Brainstorming': 'brainstorming'
    };
    const path = map[tab] || 'overview';
    this.router.navigate([path]);
  }

  openQuickFind() {
    this.quickFind?.open();
  }

  openAddNew() {
    this.addNewModal?.open();
  }

  openSettings() {
    this.settingsModal?.open();
  }

  openNotifications() {
    this.notificationCenter?.toggle();
  }
}
