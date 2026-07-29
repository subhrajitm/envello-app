import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { JournalComponent } from '@envello/feature-journal';
import { DailyNotesComponent } from '@envello/feature-daily-notes';

type Section = 'journal' | 'notes';

@Component({
  selector: 'lib-journal-hub',
  standalone: true,
  imports: [JournalComponent, DailyNotesComponent],
  template: `
    <div class="hub-wrap">
      <div class="hub-bar">
        @for (tab of tabs; track tab.id) {
          <button
            class="hub-tab"
            [class.active]="section() === tab.id"
            (click)="section.set(tab.id)"
          >
            <span class="material-symbols-outlined">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        }
      </div>
      @if (section() === 'journal') {
        <app-journal />
      } @else {
        <app-daily-notes />
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; overflow: hidden; }
    .hub-wrap { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; }
    .hub-bar {
      display: flex; align-items: center; gap: 2px;
      padding: 0 16px; height: 40px; flex-shrink: 0;
      background: var(--bg-panel); border-bottom: 1px solid var(--border-subtle);
    }
    .hub-tab {
      display: flex; align-items: center; gap: 5px;
      height: 28px; padding: 0 12px; border: none;
      background: transparent; border-radius: 20px; cursor: pointer;
      font-size: 12.5px; font-weight: 500; color: var(--text-secondary);
      transition: background .12s, color .12s; font-family: inherit;
    }
    .hub-tab:hover { background: var(--bg-hover); color: var(--text-primary); }
    .hub-tab.active {
      background: var(--accent-primary-dim); color: var(--accent-primary); font-weight: 600;
    }
    .hub-tab .material-symbols-outlined { font-size: 15px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalHubComponent {
  section = signal<Section>('journal');

  readonly tabs: { id: Section; label: string; icon: string }[] = [
    { id: 'journal', label: 'Journal', icon: 'auto_stories' },
    { id: 'notes',   label: 'Notes',   icon: 'note' },
  ];
}
