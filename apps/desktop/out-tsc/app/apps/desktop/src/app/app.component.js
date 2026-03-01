import { __decorate } from "tslib";
import { Component, inject, signal, computed } from '@angular/core';
import { AuthService } from '@envello/core';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { TauriService, SessionService } from '@envello/core';
import { HeaderComponent, FooterComponent, EnvLogoComponent } from '@envello/ui';
import { filter, map, mergeMap } from 'rxjs/operators';
/**
 * Routes that belong to a section with multiple siblings → show sub-nav bar.
 * Workspace ('workspace' / '') and Today (single item: 'daily-notes') do NOT show it.
 */
const SUB_NAV_ROUTES = new Set([
    // Plan section
    'tasks', 'meetings',
    // Library section
    'research', 'journals',
    // Create section
    'articles', 'novels', 'projects',
]);
let AppComponent = class AppComponent {
    title = 'envello';
    router = inject(Router);
    activatedRoute = inject(ActivatedRoute);
    tauriService = inject(TauriService);
    sessionService = inject(SessionService); // Initialize session tracking
    authService = inject(AuthService);
    unlistenFileDrop;
    currentTab = signal('Workspace');
    /** Current URL segment — updated on every navigation */
    currentRoute = signal('');
    hasSidebar = signal(true);
    isImmersive = signal(false);
    isFullScreen = signal(false);
    sidebarCollapsed = signal(true);
    /**
     * True when the sub-nav bar should appear:
     * - the current page belongs to a section with siblings, AND
     * - the sidebar is NOT collapsed (flyout covers minimized mode)
     */
    subNavVisible = computed(() => SUB_NAV_ROUTES.has(this.currentRoute()) && !this.sidebarCollapsed());
    navigationLayout = signal('minimized');
    navigationLayoutListener;
    ngOnInit() {
        // Load navigation layout from localStorage
        this.loadNavigationLayout();
        // Listen for navigation layout changes from settings
        this.navigationLayoutListener = (event) => {
            this.navigationLayout.set(event.detail);
        };
        window.addEventListener('navigationLayoutChanged', this.navigationLayoutListener);
        // Seed route from initial URL (before any NavigationEnd fires)
        this.currentRoute.set(this.router.url.split('/')[1]?.split('?')[0] ?? '');
        this.router.events.pipe(filter(event => event instanceof NavigationEnd), map(() => this.activatedRoute), map(route => {
            while (route.firstChild)
                route = route.firstChild;
            return route;
        }), mergeMap(route => route.data)).subscribe(data => {
            this.hasSidebar.set(data['hasSidebar'] !== false); // default to true if not specified? React logic was whitelist.
            this.isImmersive.set(!!data['immersive']);
            this.isFullScreen.set(!!data['fullScreen']);
            // Map path to Tab Name for Header
            const url = this.router.url.split('/')[1]?.split('?')[0] ?? '';
            const tabName = this.mapUrlToTabName(url);
            this.currentTab.set(tabName);
            this.currentRoute.set(url);
            // Update window title when running in Tauri
            this.tauriService.setTitle(`Envello – ${tabName}`).catch(() => { });
        });
        this.setupTauriFileDrop();
    }
    async setupTauriFileDrop() {
        this.unlistenFileDrop = await this.tauriService.onFileDrop((paths) => {
            window.dispatchEvent(new CustomEvent('envello-file-drop', { detail: { paths } }));
        });
    }
    ngOnDestroy() {
        if (this.navigationLayoutListener) {
            window.removeEventListener('navigationLayoutChanged', this.navigationLayoutListener);
        }
        this.unlistenFileDrop?.();
    }
    loadNavigationLayout() {
        const saved = localStorage.getItem('envello-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.navigationLayout.set(settings.navigationLayout || 'minimized');
            }
            catch (e) {
                console.error('Failed to load navigation layout:', e);
            }
        }
    }
    mapUrlToTabName(url) {
        const map = {
            'workspace': 'Workspace',
            'tasks': 'Tasks',
            'meetings': 'Meetings',
            'daily-notes': 'Notes',
            'research': 'Research',
            'journals': 'Journal',
            'articles': 'Drafts',
            'novels': 'Writing',
            'projects': 'Projects',
            'bin': 'Bin',
            'activity-log': 'Activity Log',
            'developer-settings': 'Developer Settings'
        };
        return map[url] || 'Workspace';
    }
    onSidebarCollapsedChange(collapsed) {
        this.sidebarCollapsed.set(collapsed);
    }
};
AppComponent = __decorate([
    Component({
        selector: 'app-root',
        standalone: true,
        imports: [RouterOutlet, HeaderComponent, FooterComponent, EnvLogoComponent],
        templateUrl: './app.component.html',
        styleUrl: './app.component.css'
    })
], AppComponent);
export { AppComponent };
