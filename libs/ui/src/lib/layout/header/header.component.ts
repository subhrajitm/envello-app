import { Component, Input, inject, ViewChild, signal, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '@envello/core';
import { NotificationService } from '@envello/core';
import { UserService } from '@envello/core';
import { Router } from '@angular/router';
import { QuickFindComponent } from '../../quick-find/quick-find.component';
import { AddNewModalComponent } from '../../add-new-modal/add-new-modal.component';
import { SettingsModalComponent } from '../../settings-modal/settings-modal.component';
import { NotificationCenterComponent } from '../../notification-center/notification-center.component';
import { ProfileMenuComponent } from '../../profile-menu/profile-menu.component';
import { ProfileEditorComponent } from '../../profile-editor/profile-editor.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, QuickFindComponent, AddNewModalComponent, SettingsModalComponent, NotificationCenterComponent, ProfileMenuComponent, ProfileEditorComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() activeTab = 'Workspace';
  @Input() isImmersive = false;
  @Output() sidebarCollapsedChange = new EventEmitter<boolean>();
  @ViewChild(QuickFindComponent) quickFind?: QuickFindComponent;
  @ViewChild(AddNewModalComponent) addNewModal?: AddNewModalComponent;
  @ViewChild(SettingsModalComponent) settingsModal?: SettingsModalComponent;
  @ViewChild(NotificationCenterComponent) notificationCenter?: NotificationCenterComponent;
  @ViewChild(ProfileMenuComponent) profileMenu?: ProfileMenuComponent;
  @ViewChild(ProfileEditorComponent) profileEditor?: ProfileEditorComponent;

  themeService = inject(ThemeService);
  notificationService = inject(NotificationService);
  userService = inject(UserService);
  private router = inject(Router);

  // Expose signals for template
  unreadCount = this.notificationService.unreadCount;
  user = this.userService.user;
  userInitials = this.userService.userInitials;

  // Navigation layout: 'vertical' | 'horizontal' | 'minimized'
  navigationLayout = signal<'vertical' | 'horizontal' | 'minimized'>('minimized');

  // Avatar loading state to prevent flash
  isAvatarLoading = signal(true);

  // Sidebar state - default to collapsed (minimized)
  sidebarCollapsed = signal(true);

  private navigationLayoutListener?: (event: CustomEvent) => void;
  private previousLayout?: 'vertical' | 'horizontal' | 'minimized';

  tabs = [
    'Workspace',
    'Tasks/Todos',
    'Daily Notes',
    'Novels/Fiction',
    'Journals',
    'Research',
    'Articles/Blogs',
    'Meetings',
    'Books/Reading',
    'Code Snippets',
  ];

  // Icon mapping for each tab
  tabIcons: Record<string, string> = {
    'Workspace': 'dashboard',
    'Daily Notes': 'note',
    'Novels/Fiction': 'menu_book',
    'Journals': 'book',
    'Research': 'science',
    'Articles/Blogs': 'article',
    'Meetings': 'groups',
    'Tasks/Todos': 'checklist',
    'Books/Reading': 'auto_stories',
    'Code Snippets': 'code',
  };

  private lastAvatarUrl: string | undefined = undefined;

  constructor() {
    // Reset loading state when avatar URL changes
    effect(() => {
      const currentAvatar = this.user()?.avatar;
      if (currentAvatar !== this.lastAvatarUrl) {
        this.lastAvatarUrl = currentAvatar;
        if (currentAvatar) {
          this.isAvatarLoading.set(true);
        } else {
          this.isAvatarLoading.set(false);
        }
      }
    });
  }

  get theme(): Theme {
    return this.themeService.theme() as Theme;
  }

  getThemeIcon(): string {
    const theme = this.theme;
    if (theme === 'dark' || theme === 'enterprise-dark') return 'dark_mode';
    if (theme === 'light' || theme === 'enterprise-light' || theme === 'typewriter') return 'light_mode';
    return 'palette';
  }

  getNextTheme(): string {
    const theme = this.theme;
    // Helper to determine if we are currently "dark-ish"
    const isDark = theme === 'dark' || theme === 'enterprise-dark';
    return isDark ? 'Light Mode' : 'Dark Mode';
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  onAvatarLoad() {
    this.isAvatarLoading.set(false);
  }

  onAvatarError() {
    this.isAvatarLoading.set(false);
  }

  navigateTo(tab: string) {
    // Map tab name back to route path
    const map: Record<string, string> = {
      'Workspace': 'workspace',
      'Novels/Fiction': 'novels',
      'Research': 'research',
      'Articles/Blogs': 'articles',
      'Journals': 'journals',
      'Daily Notes': 'daily-notes',
      'Tasks/Todos': 'tasks',
      'Meetings': 'meetings',
      'Books/Reading': 'books',
      'Code Snippets': 'snippets',
    };
    const path = map[tab] || 'workspace';
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

  openProfileMenu() {
    this.profileMenu?.toggle();
  }

  handleOpenSettings() {
    this.settingsModal?.open();
  }

  handleOpenProfile() {
    this.profileEditor?.open();
  }

  toggleSidebar() {
    // Allow toggling in both minimized and vertical modes
    if (this.navigationLayout() === 'minimized' || this.navigationLayout() === 'vertical') {
      this.sidebarCollapsed.set(!this.sidebarCollapsed());
      this.sidebarCollapsedChange.emit(this.sidebarCollapsed());
    }
  }

  getTabIcon(tab: string): string {
    return this.tabIcons[tab] || 'circle';
  }

  ngOnInit() {
    // Load navigation layout from localStorage
    this.loadNavigationLayout();

    // Listen for navigation layout changes from settings
    this.navigationLayoutListener = (event: CustomEvent) => {
      this.navigationLayout.set(event.detail);
      this.applyNavigationLayout();
    };
    window.addEventListener('navigationLayoutChanged', this.navigationLayoutListener as EventListener);

    // Apply initial layout
    this.applyNavigationLayout();
  }

  ngOnDestroy() {
    if (this.navigationLayoutListener) {
      window.removeEventListener('navigationLayoutChanged', this.navigationLayoutListener as EventListener);
    }
  }

  private loadNavigationLayout() {
    const saved = localStorage.getItem('envello-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.navigationLayout.set(settings.navigationLayout || 'minimized');
      } catch (e) {
        console.error('Failed to load navigation layout:', e);
      }
    }
  }

  private applyNavigationLayout() {
    const layout = this.navigationLayout();

    // Only set initial state when layout actually changes, not on every call
    if (this.previousLayout !== layout) {
      if (layout === 'minimized') {
        // Start collapsed in minimized mode, but allow user to expand via toggle
        this.sidebarCollapsed.set(true);
      } else if (layout === 'vertical') {
        // Start expanded in vertical mode, but allow user to collapse via toggle
        this.sidebarCollapsed.set(false);
      }
      // For horizontal, sidebar is not shown

      this.previousLayout = layout;
      this.sidebarCollapsedChange.emit(this.sidebarCollapsed());
    }
  }
}
