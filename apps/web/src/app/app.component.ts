import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { HeaderComponent, FooterComponent, KeyboardShortcutsComponent, ToastComponent, WebPreviewComponent } from '@envello/ui';
import { TauriService, SessionService, UserPreferencesService } from '@envello/core';
import { filter, map, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, KeyboardShortcutsComponent, ToastComponent, WebPreviewComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'envello';
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private tauriService = inject(TauriService);
  private sessionService = inject(SessionService);
  private userPrefsService = inject(UserPreferencesService);
  private swUpdate = inject(SwUpdate, { optional: true });
  private unlistenFileDrop?: () => void;

  updateAvailable = signal(false);

  currentTab = signal('Workspace');
  hasSidebar = signal(true);
  isImmersive = signal(false);
  isFullScreen = signal(false);
  sidebarCollapsed = signal(true);
  navigationLayout = signal<'vertical' | 'horizontal' | 'minimized'>('minimized');

  private navigationLayoutListener?: (event: CustomEvent) => void;

  async ngAfterViewInit() {
    const timeout = new Promise<void>(resolve => setTimeout(resolve, 3000));
    await Promise.race([document.fonts.ready, timeout]);
    const loader = document.getElementById('al');
    const bar = document.getElementById('al-bar');
    if (!loader) return;
    // Snap bar to 100% then fade the whole overlay
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('al-out');
      setTimeout(() => loader.remove(), 450);
    }, 250);
  }

  ngOnInit() {
    this.setupSwUpdate();
    this.loadNavigationLayout();

    // Listen for navigation layout changes from settings
    this.navigationLayoutListener = (event: CustomEvent) => {
      this.navigationLayout.set(event.detail);
    };
    window.addEventListener('navigationLayoutChanged', this.navigationLayoutListener as EventListener);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      mergeMap(route => route.data)
    ).subscribe(data => {
      this.hasSidebar.set(data['hasSidebar'] !== false); // default to true if not specified? React logic was whitelist.
      this.isImmersive.set(!!data['immersive']);
      this.isFullScreen.set(!!data['fullScreen']);

      // Map path to Tab Name for Header
      const url = this.router.url.split('/')[1];
      const tabName = this.mapUrlToTabName(url);
      this.currentTab.set(tabName);
      // Update window title when running in Tauri
      this.tauriService.setTitle(`Envello – ${tabName}`).catch(() => { });
    });
    this.setupTauriFileDrop();
  }

  private setupSwUpdate() {
    if (!this.swUpdate?.isEnabled) return;
    this.swUpdate.versionUpdates.pipe(
      filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY')
    ).subscribe(() => {
      this.updateAvailable.set(true);
    });
    this.swUpdate.checkForUpdate();
  }

  applyUpdate() {
    this.swUpdate?.activateUpdate().then(() => document.location.reload());
  }

  private async setupTauriFileDrop(): Promise<void> {
    this.unlistenFileDrop = await this.tauriService.onFileDrop((paths) => {
      window.dispatchEvent(new CustomEvent('envello-file-drop', { detail: { paths } }));
    });
  }

  ngOnDestroy() {
    if (this.navigationLayoutListener) {
      window.removeEventListener('navigationLayoutChanged', this.navigationLayoutListener as EventListener);
    }
    this.unlistenFileDrop?.();
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

  mapUrlToTabName(url: string): string {
    const map: Record<string, string> = {
      'workspace': 'Workspace',
      'write': 'Write',
      'knowledge': 'Knowledge',
      'daily-notes': 'Notes',
      'tasks': 'Tasks',
      'meetings': 'Meetings',
      'bookmarks': 'Bookmarks',
      'spaces':  'Spaces',
      // vault is desktop-only
      'transactions': 'Transactions',
      'bin': 'Bin',
      'activity-log': 'Activity Log',
      'settings': 'Settings',
    };
    return map[url] || 'Workspace';
  }

  onSidebarCollapsedChange(collapsed: boolean) {
    this.sidebarCollapsed.set(collapsed);
  }
}
