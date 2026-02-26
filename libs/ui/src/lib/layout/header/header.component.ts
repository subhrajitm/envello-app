import { Component, Input, inject, ViewChild, signal, computed, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '@envello/core';
import { NotificationService } from '@envello/core';
import { UserService } from '@envello/core';
import { VoiceService } from '@envello/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { QuickFindComponent } from '../../quick-find/quick-find.component';
import { AddNewModalComponent } from '../../add-new-modal/add-new-modal.component';
import { SettingsModalComponent } from '../../settings-modal/settings-modal.component';
import { NotificationCenterComponent } from '../../notification-center/notification-center.component';
import { ProfileMenuComponent } from '../../profile-menu/profile-menu.component';
import { ProfileEditorComponent } from '../../profile-editor/profile-editor.component';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

export interface NavSection {
  id: string;
  label: string;
  layer: string;
  icon: string;
  items: NavItem[];
}

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
  @Output() subNavVisibleChange = new EventEmitter<boolean>();
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

  voiceService = inject(VoiceService);
  isVoiceActive = this.voiceService.isVoiceActive;

  private navigationLayoutListener?: (event: CustomEvent) => void;
  private previousLayout?: 'vertical' | 'horizontal' | 'minimized';

  // Reactive route segment – updates on every navigation
  private routeSub?: Subscription;
  currentRouteSegment = signal<string>('');

  // The section whose items the current route belongs to (drives sub-nav bar)
  activeSectionForSubNav = computed<NavSection | null>(() => {
    const seg = this.currentRouteSegment();
    return this.navSections.find(s => s.items.some(i => i.route === seg)) ?? null;
  });

  navSections: NavSection[] = [
    {
      id: 'plan',
      label: 'Plan',
      layer: 'Action Layer',
      icon: 'task_alt',
      items: [
        { id: 'tasks',    label: 'Tasks',    icon: 'checklist', route: 'tasks' },
        { id: 'meetings', label: 'Meetings', icon: 'groups',    route: 'meetings' },
      ]
    },
    {
      id: 'today',
      label: 'Today',
      layer: 'Focus Layer',
      icon: 'today',
      items: [
        { id: 'daily-notes', label: 'Notes', icon: 'note', route: 'daily-notes' },
      ]
    },
    {
      id: 'library',
      label: 'Library',
      layer: 'Knowledge Layer',
      icon: 'local_library',
      items: [
        { id: 'research',  label: 'Research', icon: 'science',      route: 'research' },
        { id: 'books',     label: 'Reading',  icon: 'auto_stories', route: 'books' },
        { id: 'journals',  label: 'Journal',  icon: 'book',         route: 'journals' },
        { id: 'snippets',  label: 'Snippets', icon: 'code',         route: 'snippets' },
      ]
    },
    {
      id: 'create',
      label: 'Create',
      layer: 'Creation Layer',
      icon: 'edit_note',
      items: [
        { id: 'articles', label: 'Drafts',   icon: 'article',   route: 'articles' },
        { id: 'novels',   label: 'Writing',  icon: 'menu_book', route: 'novels' },
        { id: 'projects', label: 'Projects', icon: 'folder',    route: 'projects' },
      ]
    },
  ];

  // All flat items (for activeTab matching across sections)
  get allNavItems(): NavItem[] {
    return this.navSections.flatMap(s => s.items);
  }

  // Section collapse state (signal for change detection)
  collapsedSections = signal<Set<string>>(new Set<string>());

  isSectionCollapsed(sectionId: string): boolean {
    return this.collapsedSections().has(sectionId);
  }

  toggleSection(sectionId: string) {
    this.collapsedSections.update(set => {
      const next = new Set(set);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

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

    // Notify parent when sub-nav visibility changes
    effect(() => {
      const section = this.activeSectionForSubNav();
      const visible = !!section && section.items.length > 1;
      this.subNavVisibleChange.emit(visible);
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

  toggleVoice() {
    this.voiceService.toggleVoice();
  }

  onAvatarLoad() {
    this.isAvatarLoading.set(false);
  }

  onAvatarError() {
    this.isAvatarLoading.set(false);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  getTabIcon(tab: string): string {
    return this.allNavItems.find(i => i.label === tab || i.id === tab)?.icon || 'circle';
  }

  isItemActive(item: NavItem): boolean {
    const currentSegment = this.router.url.split('/')[1]?.split('?')[0];
    return currentSegment === item.route;
  }

  isWorkspaceActive(): boolean {
    const currentSegment = this.router.url.split('/')[1]?.split('?')[0];
    return currentSegment === 'workspace' || currentSegment === '';
  }

  isSectionActive(section: NavSection): boolean {
    return section.items.some(i => this.isItemActive(i));
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

    // Seed the route segment from the current URL immediately
    this.currentRouteSegment.set(this.router.url.split('/')[1]?.split('?')[0] ?? '');

    // Keep currentRouteSegment in sync with every navigation
    this.routeSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        this.currentRouteSegment.set(url.split('/')[1]?.split('?')[0] ?? '');
      });
  }

  ngOnDestroy() {
    if (this.navigationLayoutListener) {
      window.removeEventListener('navigationLayoutChanged', this.navigationLayoutListener as EventListener);
    }
    this.routeSub?.unsubscribe();
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
