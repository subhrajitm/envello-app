import {
  Component,
  Input,
  inject,
  ViewChild,
  signal,
  computed,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
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
  items?: NavItem[];
  route?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    QuickFindComponent,
    AddNewModalComponent,
    SettingsModalComponent,
    NotificationCenterComponent,
    ProfileMenuComponent,
    ProfileEditorComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() activeTab = 'Workspace';
  @Input() isImmersive = false;
  @Output() sidebarCollapsedChange = new EventEmitter<boolean>();
  @Output() subNavVisibleChange = new EventEmitter<boolean>();
  @ViewChild(QuickFindComponent) quickFind?: QuickFindComponent;
  @ViewChild(AddNewModalComponent) addNewModal?: AddNewModalComponent;
  @ViewChild(SettingsModalComponent) settingsModal?: SettingsModalComponent;
  @ViewChild(NotificationCenterComponent)
  notificationCenter?: NotificationCenterComponent;
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
  navigationLayout = signal<'vertical' | 'horizontal' | 'minimized'>(
    'minimized',
  );

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

  activeSectionForSubNav = computed<NavSection | null>(() => {
    const seg = this.currentRouteSegment();
    return (
      this.navSections.find(
        (s) => s.route === seg || s.items?.some((i) => i.route === seg),
      ) ?? null
    );
  });

  navSections: NavSection[] = [
    {
      id: 'today',
      label: 'Today',
      layer: 'Focus Layer',
      icon: 'today',
      items: [
        {
          id: 'daily-notes',
          label: 'Daily Notes',
          icon: 'note',
          route: 'daily-notes',
        },
        {
          id: 'today-tasks',
          label: "Today's Tasks",
          icon: 'checklist',
          route: 'tasks',
        },
      ],
    },
    {
      id: 'tasks',
      label: 'Tasks',
      layer: 'Action Layer',
      icon: 'task_alt',
      route: 'tasks',
    },
    {
      id: 'writing',
      label: 'Writing',
      layer: 'Creation Layer',
      icon: 'edit_note',
      items: [
        {
          id: 'writing-drafts',
          label: 'Drafts',
          icon: 'article',
          route: 'articles',
        },
        {
          id: 'writing-active',
          label: 'Active Pieces',
          icon: 'menu_book',
          route: 'novels',
        },
        {
          id: 'writing-published',
          label: 'Published / Done',
          icon: 'publish',
          route: 'novels',
        },
      ],
    },
  ];

  // All flat items (for activeTab matching across sections)
  get allNavItems(): NavItem[] {
    return this.navSections.flatMap((s) => s.items || []);
  }

  // Section collapse state (signal for change detection)
  collapsedSections = signal<Set<string>>(new Set<string>());

  isSectionCollapsed(sectionId: string): boolean {
    return this.collapsedSections().has(sectionId);
  }

  toggleSection(sectionId: string) {
    this.collapsedSections.update((set) => {
      const next = new Set(set);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  // ── Flyout open/close state (minimized sidebar) ────────────────
  openFlyoutId = signal<string | null>(null);
  private flyoutCloseTimer?: ReturnType<typeof setTimeout>;

  /** Open the flyout for a section (clears any pending close timer) */
  openFlyout(sectionId: string) {
    if (this.flyoutCloseTimer) {
      clearTimeout(this.flyoutCloseTimer);
      this.flyoutCloseTimer = undefined;
    }
    this.openFlyoutId.set(sectionId);
  }

  /** Delay closing by 300ms — lets the mouse cross the gap to the panel */
  scheduleFlyoutClose() {
    this.flyoutCloseTimer = setTimeout(() => {
      this.openFlyoutId.set(null);
      this.flyoutCloseTimer = undefined;
    }, 300);
  }

  /** Close immediately (used on navigation / clicking any item) */
  closeFlyout() {
    if (this.flyoutCloseTimer) {
      clearTimeout(this.flyoutCloseTimer);
      this.flyoutCloseTimer = undefined;
    }
    this.openFlyoutId.set(null);
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
      const visible = !!section && (section.items?.length ?? 0) > 1;
      this.subNavVisibleChange.emit(visible);
    });
  }

  get theme(): Theme {
    return this.themeService.theme() as Theme;
  }

  getThemeIcon(): string {
    const theme = this.theme;
    if (theme === 'dark' || theme === 'enterprise-dark') return 'dark_mode';
    if (
      theme === 'light' ||
      theme === 'enterprise-light' ||
      theme === 'typewriter'
    )
      return 'light_mode';
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

  navigateTo(route: string, viewParam?: string) {
    this.closeFlyout(); // always dismiss flyout on navigation
    // if a view query param is provided, pass it.
    if (viewParam) {
      this.router.navigate([route], { queryParams: { view: viewParam } });
    } else {
      this.router.navigate([route]);
    }
  }

  getTabIcon(tab: string): string {
    return (
      this.allNavItems.find((i) => i.label === tab || i.id === tab)?.icon ||
      'circle'
    );
  }

  isItemActive(item: NavItem): boolean {
    const currentUrlTree = this.router.parseUrl(this.router.url);
    const currentSegment =
      currentUrlTree.root.children['primary']?.segments[0]?.path;
    const currentView = currentUrlTree.queryParams['view'];

    if (currentSegment !== item.route) return false;

    // Specific match for tasks tabs to avoid all Highlighting at once
    if (item.id === 'tasks-active' && currentView === 'inbox') return true;
    if (item.id === 'tasks-upcoming' && currentView === 'upcoming') return true;
    if (item.id === 'tasks-completed' && currentView === 'completed')
      return true;

    // For non-task sections or defaults
    if (!currentView && item.id.includes('tasks'))
      return item.id === 'tasks-active'; // fallback

    return true; // Match by route segment only for simple pages
  }

  isWorkspaceActive(): boolean {
    const currentSegment = this.router.url.split('/')[1]?.split('?')[0];
    return currentSegment === 'workspace' || currentSegment === '';
  }

  isSectionActive(section: NavSection): boolean {
    if (
      this.currentRouteSegment() &&
      section.route === this.currentRouteSegment()
    )
      return true;
    if (!section.items) return false;
    return section.items.some((i) => this.isItemActive(i));
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
    if (
      this.navigationLayout() === 'minimized' ||
      this.navigationLayout() === 'vertical'
    ) {
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
    window.addEventListener(
      'navigationLayoutChanged',
      this.navigationLayoutListener as EventListener,
    );

    // Apply initial layout
    this.applyNavigationLayout();

    // Seed the route segment from the current URL immediately
    this.currentRouteSegment.set(
      this.router.url.split('/')[1]?.split('?')[0] ?? '',
    );

    // Keep currentRouteSegment in sync with every navigation
    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        this.currentRouteSegment.set(url.split('/')[1]?.split('?')[0] ?? '');
      });
  }

  ngOnDestroy() {
    if (this.navigationLayoutListener) {
      window.removeEventListener(
        'navigationLayoutChanged',
        this.navigationLayoutListener as EventListener,
      );
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
