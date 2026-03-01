import { __decorate } from "tslib";
import { Component, Input, inject, ViewChild, signal, computed, Output, EventEmitter, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '@envello/core';
import { NotificationService } from '@envello/core';
import { UserService } from '@envello/core';
import { VoiceService } from '@envello/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { QuickFindComponent } from '../../quick-find/quick-find.component';
import { AddNewModalComponent } from '../../add-new-modal/add-new-modal.component';
import { SettingsModalComponent } from '../../settings-modal/settings-modal.component';
import { NotificationCenterComponent } from '../../notification-center/notification-center.component';
import { ProfileMenuComponent } from '../../profile-menu/profile-menu.component';
import { ProfileEditorComponent } from '../../profile-editor/profile-editor.component';
let HeaderComponent = class HeaderComponent {
    activeTab = 'Workspace';
    isImmersive = false;
    sidebarCollapsedChange = new EventEmitter();
    subNavVisibleChange = new EventEmitter();
    quickFind;
    addNewModal;
    settingsModal;
    notificationCenter;
    profileMenu;
    profileEditor;
    themeService = inject(ThemeService);
    notificationService = inject(NotificationService);
    userService = inject(UserService);
    router = inject(Router);
    // Expose signals for template
    unreadCount = this.notificationService.unreadCount;
    user = this.userService.user;
    userInitials = this.userService.userInitials;
    // Navigation layout: 'vertical' | 'horizontal' | 'minimized'
    navigationLayout = signal('minimized');
    // Avatar loading state to prevent flash
    isAvatarLoading = signal(true);
    // Sidebar state - default to collapsed (minimized)
    sidebarCollapsed = signal(true);
    voiceService = inject(VoiceService);
    isVoiceActive = this.voiceService.isVoiceActive;
    navigationLayoutListener;
    previousLayout;
    // Reactive route segment – updates on every navigation
    routeSub;
    currentRouteSegment = signal('');
    // The section whose items the current route belongs to (drives sub-nav bar)
    activeSectionForSubNav = computed(() => {
        const seg = this.currentRouteSegment();
        return this.navSections.find(s => s.items.some(i => i.route === seg)) ?? null;
    });
    navSections = [
        {
            id: 'today',
            label: 'Today',
            layer: 'Focus Layer',
            icon: 'today',
            items: [
                { id: 'daily-notes', label: 'Daily Notes', icon: 'note', route: 'daily-notes' },
                { id: 'today-tasks', label: 'Today\'s Tasks', icon: 'checklist', route: 'tasks' },
            ]
        },
        {
            id: 'tasks',
            label: 'Tasks',
            layer: 'Action Layer',
            icon: 'task_alt',
            items: [
                { id: 'tasks-active', label: 'Active', icon: 'play_arrow', route: 'tasks' },
                { id: 'tasks-upcoming', label: 'Upcoming', icon: 'schedule', route: 'tasks' },
                { id: 'tasks-completed', label: 'Completed', icon: 'done_all', route: 'tasks' },
            ]
        },
        {
            id: 'writing',
            label: 'Writing',
            layer: 'Creation Layer',
            icon: 'edit_note',
            items: [
                { id: 'writing-drafts', label: 'Drafts', icon: 'article', route: 'articles' },
                { id: 'writing-active', label: 'Active Pieces', icon: 'menu_book', route: 'novels' },
                { id: 'writing-published', label: 'Published / Done', icon: 'publish', route: 'novels' },
            ]
        },
    ];
    // All flat items (for activeTab matching across sections)
    get allNavItems() {
        return this.navSections.flatMap(s => s.items);
    }
    // Section collapse state (signal for change detection)
    collapsedSections = signal(new Set());
    isSectionCollapsed(sectionId) {
        return this.collapsedSections().has(sectionId);
    }
    toggleSection(sectionId) {
        this.collapsedSections.update(set => {
            const next = new Set(set);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            }
            else {
                next.add(sectionId);
            }
            return next;
        });
    }
    // ── Flyout open/close state (minimized sidebar) ────────────────
    openFlyoutId = signal(null);
    flyoutCloseTimer;
    /** Open the flyout for a section (clears any pending close timer) */
    openFlyout(sectionId) {
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
    lastAvatarUrl = undefined;
    constructor() {
        // Reset loading state when avatar URL changes
        effect(() => {
            const currentAvatar = this.user()?.avatar;
            if (currentAvatar !== this.lastAvatarUrl) {
                this.lastAvatarUrl = currentAvatar;
                if (currentAvatar) {
                    this.isAvatarLoading.set(true);
                }
                else {
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
    get theme() {
        return this.themeService.theme();
    }
    getThemeIcon() {
        const theme = this.theme;
        if (theme === 'dark' || theme === 'enterprise-dark')
            return 'dark_mode';
        if (theme === 'light' || theme === 'enterprise-light' || theme === 'typewriter')
            return 'light_mode';
        return 'palette';
    }
    getNextTheme() {
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
    navigateTo(route) {
        this.closeFlyout(); // always dismiss flyout on navigation
        this.router.navigate([route]);
    }
    getTabIcon(tab) {
        return this.allNavItems.find(i => i.label === tab || i.id === tab)?.icon || 'circle';
    }
    isItemActive(item) {
        const currentSegment = this.router.url.split('/')[1]?.split('?')[0];
        return currentSegment === item.route;
    }
    isWorkspaceActive() {
        const currentSegment = this.router.url.split('/')[1]?.split('?')[0];
        return currentSegment === 'workspace' || currentSegment === '';
    }
    isSectionActive(section) {
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
        this.navigationLayoutListener = (event) => {
            this.navigationLayout.set(event.detail);
            this.applyNavigationLayout();
        };
        window.addEventListener('navigationLayoutChanged', this.navigationLayoutListener);
        // Apply initial layout
        this.applyNavigationLayout();
        // Seed the route segment from the current URL immediately
        this.currentRouteSegment.set(this.router.url.split('/')[1]?.split('?')[0] ?? '');
        // Keep currentRouteSegment in sync with every navigation
        this.routeSub = this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe((e) => {
            const url = e.urlAfterRedirects;
            this.currentRouteSegment.set(url.split('/')[1]?.split('?')[0] ?? '');
        });
    }
    ngOnDestroy() {
        if (this.navigationLayoutListener) {
            window.removeEventListener('navigationLayoutChanged', this.navigationLayoutListener);
        }
        this.routeSub?.unsubscribe();
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
    applyNavigationLayout() {
        const layout = this.navigationLayout();
        // Only set initial state when layout actually changes, not on every call
        if (this.previousLayout !== layout) {
            if (layout === 'minimized') {
                // Start collapsed in minimized mode, but allow user to expand via toggle
                this.sidebarCollapsed.set(true);
            }
            else if (layout === 'vertical') {
                // Start expanded in vertical mode, but allow user to collapse via toggle
                this.sidebarCollapsed.set(false);
            }
            // For horizontal, sidebar is not shown
            this.previousLayout = layout;
            this.sidebarCollapsedChange.emit(this.sidebarCollapsed());
        }
    }
};
__decorate([
    Input()
], HeaderComponent.prototype, "activeTab", void 0);
__decorate([
    Input()
], HeaderComponent.prototype, "isImmersive", void 0);
__decorate([
    Output()
], HeaderComponent.prototype, "sidebarCollapsedChange", void 0);
__decorate([
    Output()
], HeaderComponent.prototype, "subNavVisibleChange", void 0);
__decorate([
    ViewChild(QuickFindComponent)
], HeaderComponent.prototype, "quickFind", void 0);
__decorate([
    ViewChild(AddNewModalComponent)
], HeaderComponent.prototype, "addNewModal", void 0);
__decorate([
    ViewChild(SettingsModalComponent)
], HeaderComponent.prototype, "settingsModal", void 0);
__decorate([
    ViewChild(NotificationCenterComponent)
], HeaderComponent.prototype, "notificationCenter", void 0);
__decorate([
    ViewChild(ProfileMenuComponent)
], HeaderComponent.prototype, "profileMenu", void 0);
__decorate([
    ViewChild(ProfileEditorComponent)
], HeaderComponent.prototype, "profileEditor", void 0);
HeaderComponent = __decorate([
    Component({
        selector: 'app-header',
        standalone: true,
        imports: [CommonModule, QuickFindComponent, AddNewModalComponent, SettingsModalComponent, NotificationCenterComponent, ProfileMenuComponent, ProfileEditorComponent],
        templateUrl: './header.component.html',
        styleUrl: './header.component.css',
        changeDetection: ChangeDetectionStrategy.OnPush
    })
], HeaderComponent);
export { HeaderComponent };
