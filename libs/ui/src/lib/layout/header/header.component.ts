import { Component, Input, inject, ViewChild, signal, computed, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '@envello/core';
import { NotificationService } from '@envello/core';
import { UserService } from '@envello/core';
import { VoiceService } from '@envello/core';
import { BinService } from '@envello/core';
import { WorkspaceProfileService, StoreService } from '@envello/core';
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



@Component({
  selector: 'lib-header',
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
  private binService = inject(BinService);
  private workspaceService = inject(WorkspaceProfileService);
  private storeService = inject(StoreService);
  private router = inject(Router);

  // Space switcher
  showSpaceSwitcher = signal(false);

  /**
   * Merged Space list: 'All Spaces' (default) pinned first, then user-created
   * spaces from the store. Uses workspaceService profiles as the canonical list
   * but keeps them in sync with the DB via the effect in constructor.
   */
  spaces = computed(() => {
    const profiles = this.workspaceService.profiles();
    // Separate the default 'All Spaces' entry from user spaces
    const defaultProfile = profiles.find(p => p.id === 'default');
    const userProfiles = profiles.filter(p => p.id !== 'default');
    return defaultProfile ? [defaultProfile, ...userProfiles] : userProfiles;
  });

  activeSpace = this.workspaceService.activeProfile;

  toggleSpaceSwitcher() { this.showSpaceSwitcher.update(v => !v); }
  closeSpaceSwitcher() { this.showSpaceSwitcher.set(false); }

  switchSpace(id: string) {
    this.closeSpaceSwitcher();
    if (this.activeSpace().id !== id) this.workspaceService.switchProfile(id);
  }

  manageSpaces() {
    this.closeSpaceSwitcher();
    this.router.navigate(['/spaces']);
  }

  binCount = computed(() => this.binService.items().length);

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



  navItems: NavItem[] = [
    { id: 'tasks',       label: 'Tasks',    icon: 'checklist', route: 'tasks' },
    { id: 'meetings',    label: 'Meetings', icon: 'groups',    route: 'meetings' },
    { id: 'daily-notes', label: 'Notes',    icon: 'note',      route: 'daily-notes' },
    { id: 'knowledge',   label: 'Knowledge',  icon: 'science',   route: 'knowledge' },
    { id: 'write',       label: 'Write',    icon: 'edit',      route: 'write' },
    { id: 'vault',       label: 'Vault',    icon: 'lock',      route: 'vault' },
    { id: 'subscriptions',label: 'Subscriptions', icon: 'credit_card',route: 'subscriptions' },
    { id: 'bookmarks',   label: 'Bookmarks', icon: 'bookmarks', route: 'bookmarks' },
  ];

  // All flat items (for activeTab matching across sections)
  get allNavItems(): NavItem[] {
    return this.navItems;
  }





  private lastAvatarUrl: string | undefined = undefined;

  constructor() {
    // Sync spaces from DB into WorkspaceProfileService (idempotent — addProfileWithId
    // is a no-op if the profile already exists). This ensures spaces created before
    // the profile-linking flow was introduced still appear in the switcher.
    effect(() => {
      const dbSpaces = this.storeService.spaces();
      for (const p of dbSpaces) {
        this.workspaceService.addProfileWithId(p.id, p.title, '#3b82f6', p.icon);
      }
    });

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
      this.subNavVisibleChange.emit(false);
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
    return this.navItems.find(i => i.label === tab || i.id === tab)?.icon || 'circle';
  }

  isItemActive(item: NavItem): boolean {
    const currentSegment = this.router.url.split('/')[1]?.split('?')[0];
    return currentSegment === item.route;
  }

  isWorkspaceActive(): boolean {
    const currentSegment = this.router.url.split('/')[1]?.split('?')[0];
    return currentSegment === 'workspace' || currentSegment === '';
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
      this.saveSidebarCollapsed(this.sidebarCollapsed());
    }
  }

  private saveSidebarCollapsed(collapsed: boolean) {
    try {
      const saved = localStorage.getItem('envello-settings');
      const settings = saved ? JSON.parse(saved) : {};
      settings.sidebarCollapsed = collapsed;
      localStorage.setItem('envello-settings', JSON.stringify(settings));
    } catch { }
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
        // Close mobile drawer on navigation
        if (window.innerWidth <= 768 && !this.sidebarCollapsed()) {
          this.sidebarCollapsed.set(true);
          this.sidebarCollapsedChange.emit(true);
        }
      });
  }

  ngOnDestroy() {
    if (this.navigationLayoutListener) {
      window.removeEventListener('navigationLayoutChanged', this.navigationLayoutListener as EventListener);
    }
    this.routeSub?.unsubscribe();
  }

  private sidebarRestoredFromStorage = false;

  private loadNavigationLayout() {
    const saved = localStorage.getItem('envello-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.navigationLayout.set(settings.navigationLayout || 'minimized');
        if (typeof settings.sidebarCollapsed === 'boolean') {
          this.sidebarCollapsed.set(settings.sidebarCollapsed);
          this.sidebarRestoredFromStorage = true;
        }
      } catch (e) {
        console.error('Failed to load navigation layout:', e);
      }
    }
  }

  private applyNavigationLayout() {
    const layout = this.navigationLayout();

    if (this.previousLayout !== layout) {
      // If we just restored from storage (first run), honour the saved value —
      // only apply layout defaults when no saved preference exists or when
      // the user actively switches to a different layout type.
      const isInit = this.previousLayout === undefined;
      if (!isInit || !this.sidebarRestoredFromStorage) {
        if (layout === 'minimized') {
          this.sidebarCollapsed.set(true);
          this.saveSidebarCollapsed(true);
        } else if (layout === 'vertical') {
          this.sidebarCollapsed.set(false);
          this.saveSidebarCollapsed(false);
        }
      }

      this.previousLayout = layout;
      this.sidebarCollapsedChange.emit(this.sidebarCollapsed());
    }
  }
}
