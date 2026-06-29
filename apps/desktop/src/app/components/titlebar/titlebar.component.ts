import { Component, Input, inject, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { WorkspaceProfileService } from '@envello/core';
import { Router } from '@angular/router';

type NavLayout = 'minimized' | 'vertical' | 'horizontal';

@Component({
  selector: 'app-titlebar',
  standalone: true,
  template: `
    <div class="titlebar" data-tauri-drag-region>
      <div class="titlebar-traffic" data-tauri-drag-region></div>

      <!-- Space switcher trigger -->
      <button class="titlebar-space-btn" (click)="openSwitcher()" title="Switch space (⌘P)">
        <span class="titlebar-space-dot" [style.background]="activeSpace().color"></span>
        <span class="titlebar-space-name">{{ activeSpace().name }}</span>
        <span class="material-symbols-outlined titlebar-space-chevron">unfold_more</span>
      </button>

      <!-- Layout toggles -->
      <div class="titlebar-actions">
        <button class="tb-btn" [class.active]="layout() === 'minimized'" (click)="setLayout('minimized')" title="Compact sidebar">
          <span class="material-symbols-outlined">dock_to_left</span>
        </button>
        <button class="tb-btn" [class.active]="layout() === 'vertical'" (click)="setLayout('vertical')" title="Full sidebar">
          <span class="material-symbols-outlined">left_panel_open</span>
        </button>
        <button class="tb-btn" [class.active]="layout() === 'horizontal'" (click)="setLayout('horizontal')" title="Top navigation">
          <span class="material-symbols-outlined">view_day</span>
        </button>
      </div>
    </div>

    <!-- Space switcher palette -->
    @if (showSwitcher()) {
      <div class="sp-backdrop" (click)="closeSwitcher()"></div>
      <div class="sp-palette" role="dialog" aria-label="Switch space">

        <!-- Search -->
        <div class="sp-search-row">
          <span class="material-symbols-outlined sp-search-icon">search</span>
          <input
            #searchInput
            class="sp-search"
            type="text"
            placeholder="Search spaces…"
            [value]="query()"
            (input)="onQuery($event)"
            autocomplete="off"
            spellcheck="false"
          />
          @if (query()) {
            <button class="sp-clear" (click)="clearQuery()">
              <span class="material-symbols-outlined">close</span>
            </button>
          }
        </div>

        <!-- List -->
        <div class="sp-list">
          <div class="sp-section-label">Spaces</div>
          @if (filtered().length === 0) {
            <div class="sp-empty">No results for "{{ query() }}"</div>
          }
          @for (p of filtered(); track p.id; let i = $index) {
            <button
              class="sp-item"
              [class.sp-item--active]="activeSpace().id === p.id"
              [class.sp-item--focused]="focusedIndex() === i"
              (click)="select(p.id)"
              (mouseenter)="focusedIndex.set(i)">
              <span class="sp-avatar" [style.background]="p.color + '22'" [style.color]="p.color">
                {{ p.name.charAt(0).toUpperCase() }}
              </span>
              <span class="sp-item-name">{{ p.name }}</span>
              @if (activeSpace().id === p.id) {
                <span class="material-symbols-outlined sp-check">check</span>
              }
            </button>
          }
        </div>

        <!-- Footer -->
        <div class="sp-footer">
          <button class="sp-manage" (click)="manageSpaces()">
            <span class="material-symbols-outlined">add</span>
            New space
          </button>
          <button class="sp-manage" (click)="manageSpaces()">
            <span class="material-symbols-outlined">settings</span>
            Manage
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Titlebar ── */
    .titlebar {
      display: flex;
      align-items: center;
      height: 28px;
      width: 100%;
      flex-shrink: 0;
      background: transparent;
      position: relative;
      user-select: none;
      -webkit-user-select: none;
    }

    .titlebar-traffic {
      width: 80px;
      height: 100%;
      flex-shrink: 0;
    }

    .titlebar-space-btn {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      background: transparent;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      white-space: nowrap;
      max-width: 220px;
      transition: background 0.15s;
    }
    .titlebar-space-btn:hover { background: var(--border-subtle, rgba(128,128,128,0.15)); }

    .titlebar-space-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .titlebar-space-name {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary, #555);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .titlebar-space-chevron {
      font-size: 12px;
      color: var(--text-tertiary, #999);
      font-variation-settings: 'wght' 300;
    }

    .titlebar-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: auto;
      padding-right: 8px;
    }

    .tb-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 22px;
      border: none;
      background: transparent;
      border-radius: 5px;
      cursor: pointer;
      color: var(--text-muted, #999);
      transition: background 0.15s, color 0.15s;
      padding: 0;
    }
    .tb-btn .material-symbols-outlined { font-size: 14px; font-variation-settings: 'wght' 300; }
    .tb-btn:hover { background: var(--border-subtle, rgba(128,128,128,0.15)); color: var(--text-primary, #222); }
    .tb-btn.active { background: var(--border-subtle, rgba(128,128,128,0.18)); color: var(--accent-primary, #b45309); }

    /* ── Space switcher palette ── */
    .sp-backdrop {
      position: fixed;
      inset: 0;
      z-index: var(--z-notification);
      background: rgba(0,0,0,0.18);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      animation: sp-fade 0.1s ease-out;
    }

    .sp-palette {
      position: fixed;
      top: 18%;
      left: 50%;
      transform: translateX(-50%);
      width: 360px;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05);
      z-index: var(--z-system);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: sp-in 0.18s cubic-bezier(0.22, 1, 0.36, 1);
    }

    @keyframes sp-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes sp-in {
      from { opacity: 0; transform: translateX(-50%) scale(0.95) translateY(-8px); }
      to   { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
    }

    /* Search */
    .sp-search-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
    }

    .sp-search-icon {
      font-size: 20px;
      color: var(--text-tertiary);
      flex-shrink: 0;
    }

    .sp-search {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-size: 15px;
      font-weight: 400;
      color: var(--text-primary);
      caret-color: var(--accent-primary);
      min-width: 0;
    }
    .sp-search::placeholder { color: var(--text-tertiary); }

    .sp-clear {
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: background 0.1s, color 0.1s;
    }
    .sp-clear .material-symbols-outlined { font-size: 14px; }
    .sp-clear:hover { color: var(--text-primary); background: var(--bg-hover); }

    /* List */
    .sp-list {
      padding: 4px 8px 8px;
      max-height: 300px;
      overflow-y: auto;
      border-top: 1px solid var(--border-subtle);
    }

    .sp-section-label {
      padding: 8px 8px 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-tertiary);
    }

    .sp-empty {
      padding: 24px 12px;
      text-align: center;
      font-size: 13px;
      color: var(--text-tertiary);
    }

    .sp-item {
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      padding: 8px 8px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 400;
      cursor: pointer;
      text-align: left;
      transition: background 0.1s, color 0.1s;
    }
    .sp-item:hover,
    .sp-item--focused { background: var(--bg-hover); color: var(--text-primary); }
    .sp-item--active { color: var(--text-primary); font-weight: 500; }

    .sp-avatar {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
      letter-spacing: 0;
    }

    .sp-item-name { flex: 1; }

    .sp-check {
      font-size: 16px;
      color: var(--accent-primary);
      flex-shrink: 0;
    }

    /* Footer */
    .sp-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px 10px;
      border-top: 1px solid var(--border-subtle);
    }

    .sp-manage {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 8px;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--text-tertiary);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.1s, color 0.1s;
    }
    .sp-manage .material-symbols-outlined { font-size: 14px; }
    .sp-manage:hover { background: var(--bg-hover); color: var(--text-secondary); }
  `]
})
export class TitlebarComponent implements OnInit, OnDestroy {
  @Input() activeTab = 'Workspace';
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  private workspaceService = inject(WorkspaceProfileService);
  private router = inject(Router);

  activeSpace = this.workspaceService.activeProfile;
  spaces = computed(() => {
    const profiles = this.workspaceService.profiles();
    const def = profiles.find(p => p.id === 'default');
    const rest = profiles.filter(p => p.id !== 'default');
    return def ? [def, ...rest] : rest;
  });

  showSwitcher = signal(false);
  query = signal('');
  focusedIndex = signal(0);

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    return q ? this.spaces().filter(p => p.name.toLowerCase().includes(q)) : this.spaces();
  });

  layout = signal<NavLayout>('minimized');

  ngOnInit() {
    try {
      const saved = localStorage.getItem('envello-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.layout.set(settings.navigationLayout || 'minimized');
      }
    } catch { /* ignore */ }
  }

  ngOnDestroy() {}

  openSwitcher() {
    this.query.set('');
    this.focusedIndex.set(this.spaces().findIndex(p => p.id === this.activeSpace().id));
    this.showSwitcher.set(true);
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
  }

  closeSwitcher() {
    this.showSwitcher.set(false);
    this.query.set('');
  }

  clearQuery() {
    this.query.set('');
    this.focusedIndex.set(0);
    this.searchInput?.nativeElement.focus();
  }

  onQuery(e: Event) {
    this.query.set((e.target as HTMLInputElement).value);
    this.focusedIndex.set(0);
  }

  select(id: string) {
    this.closeSwitcher();
    if (this.activeSpace().id !== id) this.workspaceService.switchProfile(id);
  }

  manageSpaces() {
    this.closeSwitcher();
    this.router.navigate(['/spaces']);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.showSwitcher()) return;
    const list = this.filtered();
    if (e.key === 'Escape') { e.preventDefault(); this.closeSwitcher(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); this.focusedIndex.set((this.focusedIndex() + 1) % list.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.focusedIndex.set((this.focusedIndex() - 1 + list.length) % list.length); }
    else if (e.key === 'Enter') { e.preventDefault(); const p = list[this.focusedIndex()]; if (p) this.select(p.id); }
  }

  setLayout(mode: NavLayout) {
    this.layout.set(mode);
    try {
      const saved = localStorage.getItem('envello-settings');
      const settings = saved ? JSON.parse(saved) : {};
      settings.navigationLayout = mode;
      localStorage.setItem('envello-settings', JSON.stringify(settings));
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('navigationLayoutChanged', { detail: mode }));
  }
}
