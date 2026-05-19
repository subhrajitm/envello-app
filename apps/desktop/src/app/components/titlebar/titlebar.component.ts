import { Component, Input, inject, signal, OnInit } from '@angular/core';
import { TauriService } from '@envello/core';

type NavLayout = 'minimized' | 'vertical' | 'horizontal';

@Component({
  selector: 'app-titlebar',
  standalone: true,
  template: `
    <div class="titlebar" data-tauri-drag-region>
      <!-- Traffic light zone — macOS places ⬤⬤⬤ here automatically -->
      <div class="titlebar-traffic" data-tauri-drag-region></div>

      <!-- Centered window title (draggable) -->
      <div class="titlebar-title" data-tauri-drag-region>{{ activeTab }}</div>

      <!-- Right: navigation layout toggles -->
      <div class="titlebar-actions">
        <button
          class="tb-btn"
          [class.active]="layout() === 'minimized'"
          (click)="setLayout('minimized')"
          title="Compact sidebar">
          <span class="material-symbols-outlined">dock_to_left</span>
        </button>
        <button
          class="tb-btn"
          [class.active]="layout() === 'vertical'"
          (click)="setLayout('vertical')"
          title="Full sidebar">
          <span class="material-symbols-outlined">left_panel_open</span>
        </button>
        <button
          class="tb-btn"
          [class.active]="layout() === 'horizontal'"
          (click)="setLayout('horizontal')"
          title="Top navigation">
          <span class="material-symbols-outlined">view_day</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
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

    /* Reserve space for macOS traffic lights (~75px) */
    .titlebar-traffic {
      width: 80px;
      height: 100%;
      flex-shrink: 0;
    }

    .titlebar-title {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted, #888);
      letter-spacing: 0.02em;
      pointer-events: none;
      white-space: nowrap;
      max-width: 40%;
      overflow: hidden;
      text-overflow: ellipsis;
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

    .tb-btn .material-symbols-outlined {
      font-size: 14px;
      font-variation-settings: 'wght' 300;
    }

    .tb-btn:hover {
      background: var(--border-subtle, rgba(128,128,128,0.15));
      color: var(--text-primary, #222);
    }

    .tb-btn.active {
      background: var(--border-subtle, rgba(128,128,128,0.18));
      color: var(--accent-primary, #b45309);
    }
  `]
})
export class TitlebarComponent implements OnInit {
  @Input() activeTab = 'Workspace';

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
