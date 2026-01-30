import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from './components/layout/header/header.component';
import { FooterComponent } from './components/layout/footer/footer.component';
import { TauriService } from './core/services/tauri.service';
import { SessionService } from './services/session.service';
import { filter, map, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'envello';
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private tauriService = inject(TauriService);
  private sessionService = inject(SessionService); // Initialize session tracking
  private unlistenFileDrop?: () => void;

  currentTab = signal('Overview');
  hasSidebar = signal(true);
  isImmersive = signal(false);
  sidebarCollapsed = signal(true);
  navigationLayout = signal<'vertical' | 'horizontal' | 'minimized'>('minimized');

  private navigationLayoutListener?: (event: CustomEvent) => void;

  ngOnInit() {
    // Load navigation layout from localStorage
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

      // Map path to Tab Name for Header
      const url = this.router.url.split('/')[1];
      const tabName = this.mapUrlToTabName(url);
      this.currentTab.set(tabName);
      // Update window title when running in Tauri
      this.tauriService.setTitle(`Envello – ${tabName}`).catch(() => { });
    });
    this.setupTauriFileDrop();
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
      'overview': 'Overview',
      'novels': 'Novels/Fiction',
      'research': 'Research',
      'articles': 'Articles/Blogs',
      'journals': 'Journals',
      'daily-notes': 'Daily Notes',
      'tasks': 'Tasks/Todos',
      'meetings': 'Meetings',
      'books': 'Books/Reading',
      'snippets': 'Code Snippets',
      'bin': 'Bin',
      'activity-log': 'Activity Log',
      'developer-settings': 'Developer Settings'
    };
    return map[url] || 'Overview';
  }

  onSidebarCollapsedChange(collapsed: boolean) {
    this.sidebarCollapsed.set(collapsed);
  }
}
