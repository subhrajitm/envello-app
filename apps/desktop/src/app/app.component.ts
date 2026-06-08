import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { AuthService, BookContentService, UserPreferencesService } from '@envello/core';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { TauriService, SessionService } from '@envello/core';
import { HeaderComponent, FooterComponent, EnvLogoComponent, KeyboardShortcutsComponent, OnboardingComponent, ToastComponent, WebPreviewComponent } from '@envello/ui';
import { UpdateBannerComponent } from './components/update-banner/update-banner.component';
import { TitlebarComponent } from './components/titlebar/titlebar.component';
import { UpdateService } from './services/update.service';
import { filter, map, mergeMap } from 'rxjs/operators';

const SUB_NAV_ROUTES = new Set([
  'tasks', 'meetings', 'knowledge', 'write', 'spaces',
]);

// Global shortcuts registered at app level
const GLOBAL_SHORTCUTS: Record<string, string> = {
  'CommandOrControl+Shift+N': '/daily-notes',      // Quick note
  'CommandOrControl+Shift+T': '/tasks',            // Jump to tasks
  'CommandOrControl+Shift+W': '/workspace',        // Jump to workspace
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, EnvLogoComponent, KeyboardShortcutsComponent, OnboardingComponent, UpdateBannerComponent, TitlebarComponent, ToastComponent, WebPreviewComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'envello';
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private tauriService = inject(TauriService);
  private sessionService = inject(SessionService);
  private updateService = inject(UpdateService);
  authService = inject(AuthService);
  private bookContentService = inject(BookContentService);
  private userPrefsService = inject(UserPreferencesService);

  private unlistenFileDrop?: () => void;
  private unlistenCloseRequested?: () => void;
  private unlistenDeepLink?: () => void;
  private unlistenTrayNewNote?: () => void;

  currentTab = signal('Workspace');
  currentRoute = signal('');
  hasSidebar = signal(true);
  isImmersive = signal(false);
  isFullScreen = signal(false);
  sidebarCollapsed = signal(true);

  subNavVisible = computed(() =>
    SUB_NAV_ROUTES.has(this.currentRoute()) && !this.sidebarCollapsed()
  );
  navigationLayout = signal<'vertical' | 'horizontal' | 'minimized'>('minimized');

  private navigationLayoutListener?: (event: CustomEvent) => void;

  ngOnInit() {
    this.loadNavigationLayout();

    this.navigationLayoutListener = (event: CustomEvent) => {
      this.navigationLayout.set(event.detail);
    };
    window.addEventListener('navigationLayoutChanged', this.navigationLayoutListener as EventListener);

    this.currentRoute.set(this.router.url.split('/')[1]?.split('?')[0] ?? '');

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      mergeMap(route => route.data)
    ).subscribe(data => {
      this.hasSidebar.set(data['hasSidebar'] !== false);
      this.isImmersive.set(!!data['immersive']);
      this.isFullScreen.set(!!data['fullScreen']);

      const url = this.router.url.split('/')[1]?.split('?')[0] ?? '';
      this.currentTab.set(this.mapUrlToTabName(url));
      this.currentRoute.set(url);
      this.tauriService.setTitle('').catch(() => { /* ignore */ });
    });

    this.setupTauriFileDrop();
    this.setupTauriCloseHandler();
    this.setupGlobalShortcuts();
    this.setupDeepLinks();
    this.setupTrayEvents();
    setTimeout(() => this.updateService.checkForUpdate(), 3000);
  }

  private async setupTauriFileDrop(): Promise<void> {
    this.unlistenFileDrop = await this.tauriService.onFileDrop((paths) => {
      window.dispatchEvent(new CustomEvent('envello-file-drop', { detail: { paths } }));
    });
  }

  private async setupTauriCloseHandler(): Promise<void> {
    if (!this.tauriService.isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      this.unlistenCloseRequested = await win.onCloseRequested(async (event) => {
        event.preventDefault();
        try { await this.bookContentService.flushPersist(); } catch { /* non-fatal */ }
        // Respect "minimize to tray" setting — hide instead of destroy if enabled
        const settings = JSON.parse(localStorage.getItem('envello-settings') || '{}');
        if (settings['minimizeToTray']) {
          await win.hide();
        } else {
          await win.destroy();
        }
      });
    } catch { /* Non-Tauri or API unavailable */ }
  }

  private async setupGlobalShortcuts(): Promise<void> {
    if (!this.tauriService.isTauri()) return;
    try {
      for (const [shortcut, route] of Object.entries(GLOBAL_SHORTCUTS)) {
        await this.tauriService.registerShortcut(shortcut, () => {
          this.tauriService.showWindow();
          this.router.navigate([route]);
        });
      }
    } catch { /* shortcuts may already be registered or OS denied */ }
  }

  private async setupDeepLinks(): Promise<void> {
    if (!this.tauriService.isTauri()) return;
    // Handle deep link that launched this instance
    const launchUrl = await this.tauriService.getLaunchDeepLink();
    if (launchUrl) this.handleDeepLink(launchUrl);
    // Handle deep links while the app is running
    this.unlistenDeepLink = await this.tauriService.onDeepLink((url) => {
      this.tauriService.showWindow();
      this.handleDeepLink(url);
    });
  }

  private handleDeepLink(url: string): void {
    try {
      // envello://note/<id>    → /daily-notes?id=<id>
      // envello://task/<id>   → /tasks?id=<id>
      // envello://workspace   → /workspace
      const { pathname } = new URL(url.replace('envello://', 'https://envello.app/'));
      const [, section, id] = pathname.split('/');
      const routeMap: Record<string, string> = {
        note: '/daily-notes', task: '/tasks', workspace: '/workspace',
        write: '/write', bookmarks: '/bookmarks', knowledge: '/knowledge',
      };
      const route = routeMap[section];
      if (route) {
        this.router.navigate([route], id ? { queryParams: { id } } : {});
      }
    } catch { /* malformed URL */ }
  }

  private async setupTrayEvents(): Promise<void> {
    this.unlistenTrayNewNote = await this.tauriService.onTrayNewNote(() => {
      this.router.navigate(['/daily-notes']);
    });
  }

  ngOnDestroy() {
    if (this.navigationLayoutListener) {
      window.removeEventListener('navigationLayoutChanged', this.navigationLayoutListener as EventListener);
    }
    this.unlistenFileDrop?.();
    this.unlistenCloseRequested?.();
    this.unlistenDeepLink?.();
    this.unlistenTrayNewNote?.();
    this.tauriService.unregisterAllShortcuts().catch(() => {});
  }

  private loadNavigationLayout() {
    const saved = localStorage.getItem('envello-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.navigationLayout.set(settings.navigationLayout || 'minimized');
      } catch { /* ignore */ }
    }
  }

  mapUrlToTabName(url: string): string {
    const map: Record<string, string> = {
      'workspace': 'Workspace', 'tasks': 'Tasks', 'meetings': 'Meetings',
      'daily-notes': 'Notes', 'knowledge': 'Knowledge', 'write': 'Write',
      'spaces': 'Spaces', 'bin': 'Bin', 'activity-log': 'Activity Log',
      'settings': 'Settings', 'developer-settings': 'Developer Settings',
      'bookmarks': 'Bookmarks', 'vault': 'Vault', 'subscriptions': 'Subscriptions',
    };
    return map[url] || 'Workspace';
  }

  onSidebarCollapsedChange(collapsed: boolean) {
    this.sidebarCollapsed.set(collapsed);
  }
}
