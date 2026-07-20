import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HabitStore } from '@envello/state';
import { Habit } from '@envello/domain';
import { ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent } from '@envello/ui';

const ICON_OPTIONS = [
    'fitness_center', 'directions_run', 'water_drop', 'auto_stories',
    'self_improvement', 'restaurant', 'bedtime', 'code',
    'school', 'music_note', 'brush', 'language',
    'timer', 'favorite', 'eco', 'psychology',
    'sports_soccer', 'emoji_food_beverage', 'hiking', 'spa',
];

const COLOR_OPTIONS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#f59e0b', '#22c55e', '#14b8a6',
    '#3b82f6', '#06b6d4', '#84cc16', '#a855f7',
];

type ViewMode = 'today' | 'all' | 'weekly' | 'archived';

@Component({
    selector: 'app-habits',
    standalone: true,
    imports: [CommonModule, FormsModule, ConfirmDialogComponent, FeatureSidebarComponent, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
<div class="hb-view">

  <!-- ── SIDEBAR ── -->
  <env-feature-sidebar [title]="'Habits'">
    <nav class="hb-sb-nav">
      <button class="hb-sb-item" [class.active]="view() === 'today'" (click)="view.set('today')">
        <span class="material-symbols-outlined">today</span>
        <span class="hb-sb-label">Today</span>
        <span class="hb-sb-count">{{ store.activeHabits().length }}</span>
      </button>
      <button class="hb-sb-item" [class.active]="view() === 'all'" (click)="view.set('all')">
        <span class="material-symbols-outlined">format_list_bulleted</span>
        <span class="hb-sb-label">All Habits</span>
        <span class="hb-sb-count">{{ store.activeHabits().length }}</span>
      </button>
      <button class="hb-sb-item" [class.active]="view() === 'weekly'" (click)="view.set('weekly')">
        <span class="material-symbols-outlined">view_week</span>
        <span class="hb-sb-label">This Week</span>
      </button>
    </nav>

    @if (store.archivedHabits().length > 0) {
      <div class="hb-sb-divider"></div>
      <div class="hb-sb-section-title">Archive</div>
      <button class="hb-sb-item" [class.active]="view() === 'archived'" (click)="view.set('archived')">
        <span class="material-symbols-outlined">inventory_2</span>
        <span class="hb-sb-label">Archived</span>
        <span class="hb-sb-count">{{ store.archivedHabits().length }}</span>
      </button>
    }
  </env-feature-sidebar>

  <!-- ── MAIN ── -->
  <div class="hb-main">

    <!-- Toolbar -->
    <div class="hb-toolbar">
      <div class="hb-toolbar-left">
        @if (view() === 'today') {
          <span class="hb-date-label">{{ todayLabel() }}</span>
        } @else if (view() === 'weekly') {
          <span class="hb-date-label">This Week</span>
        } @else if (view() === 'archived') {
          <span class="hb-date-label">Archived Habits</span>
        } @else {
          <span class="hb-date-label">All Habits</span>
        }
      </div>
      @if (view() !== 'archived') {
        <button class="hb-add-btn" (click)="openAddForm()">
          <span class="material-symbols-outlined">add</span>
          Add Habit
        </button>
      }
    </div>

    <!-- Progress strip (today view) -->
    @if (view() === 'today' && store.activeHabits().length > 0) {
      <div class="hb-progress-wrap">
        <div class="hb-progress-track">
          <div class="hb-progress-fill" [style.width.%]="todayProgressPct()"></div>
        </div>
        <div class="hb-progress-meta">
          <span class="hb-progress-text">
            @if (todayProgressPct() === 100) {
              All done today 🎉
            } @else {
              {{ todayDone() }} / {{ store.activeHabits().length }} done
            }
          </span>
          @if (store.activeHabits().length > 0) {
            <span class="hb-progress-pct">{{ todayProgressPct() | number:'1.0-0' }}%</span>
          }
        </div>
      </div>
    }

    <!-- Habit list -->
    <div class="hb-list-scroll">

      @if (visibleHabits().length === 0) {
        @if (store.activeHabits().length === 0 && view() !== 'archived') {
          <env-empty-state
            icon="self_improvement"
            title="No habits yet"
            description="Build streaks and track daily routines — add your first habit to get started.">
          </env-empty-state>
        } @else {
          <env-empty-state
            icon="done_all"
            title="Nothing here">
          </env-empty-state>
        }
      } @else {

        <!-- Today / All view -->
        @if (view() === 'today' || view() === 'all' || view() === 'archived') {
          <div class="hb-list">
            @for (habit of visibleHabits(); track habit.id) {
              <div class="hb-item"
                [class.hb-item--done]="view() !== 'archived' && store.isCompletedToday(habit.id)"
                [class.hb-item--archived]="view() === 'archived'">

                <!-- Check button (not shown for archived) -->
                @if (view() !== 'archived') {
                  <button class="hb-check"
                    [class.hb-check--done]="store.isCompletedToday(habit.id)"
                    (click)="store.toggle(habit.id)"
                    [title]="store.isCompletedToday(habit.id) ? 'Mark incomplete' : 'Mark done'">
                    @if (store.isCompletedToday(habit.id)) {
                      <span class="material-symbols-outlined">check</span>
                    }
                  </button>
                }

                <!-- Icon avatar -->
                <div class="hb-avatar" [style.background]="habit.color">
                  <span class="material-symbols-outlined">{{ habit.icon }}</span>
                </div>

                <!-- Info -->
                <div class="hb-info">
                  <div class="hb-name" [class.hb-name--done]="view() !== 'archived' && store.isCompletedToday(habit.id)">
                    {{ habit.name }}
                  </div>
                  <div class="hb-meta">
                    <span class="hb-freq-badge">{{ habit.frequency }}</span>
                    @if (habit.description) {
                      <span class="hb-desc">{{ habit.description }}</span>
                    }
                  </div>
                </div>

                <!-- Streak -->
                @if (view() !== 'archived') {
                  <div class="hb-streak" [class.hb-streak--hot]="store.streakFor(habit.id) >= 3">
                    <span class="hb-streak-fire">🔥</span>
                    <span class="hb-streak-n">{{ store.streakFor(habit.id) }}</span>
                  </div>
                }

                <!-- Actions (shown on hover) -->
                <div class="hb-actions">
                  @if (view() === 'archived') {
                    <button class="hb-act-btn" (click)="store.unarchiveHabit(habit.id)" title="Restore">
                      <span class="material-symbols-outlined">unarchive</span>
                    </button>
                    <button class="hb-act-btn hb-act-btn--danger" (click)="confirmDelete.set(habit.id)" title="Delete permanently">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  } @else {
                    <button class="hb-act-btn" (click)="openEdit(habit)" title="Edit">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="hb-act-btn" (click)="store.archiveHabit(habit.id)" title="Archive">
                      <span class="material-symbols-outlined">inventory_2</span>
                    </button>
                    <button class="hb-act-btn hb-act-btn--danger" (click)="confirmDelete.set(habit.id)" title="Delete">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  }
                </div>

              </div>
            }
          </div>
        }

        <!-- Weekly view -->
        @if (view() === 'weekly') {
          <div class="hb-week-section">
            <div class="hb-week-header">
              @for (d of weekDayLabels; track d.date) {
                <div class="hb-week-day" [class.hb-week-day--today]="d.isToday">{{ d.label }}</div>
              }
            </div>
            <div class="hb-week-list">
              @for (habit of visibleHabits(); track habit.id) {
                <div class="hb-week-row">
                  <div class="hb-week-info">
                    <div class="hb-week-avatar" [style.background]="habit.color">
                      <span class="material-symbols-outlined">{{ habit.icon }}</span>
                    </div>
                    <span class="hb-week-name">{{ habit.name }}</span>
                    <div class="hb-streak hb-streak--sm" [class.hb-streak--hot]="store.streakFor(habit.id) >= 3">
                      <span class="hb-streak-fire">🔥</span>
                      <span class="hb-streak-n">{{ store.streakFor(habit.id) }}</span>
                    </div>
                  </div>
                  <div class="hb-week-dots">
                    @for (d of weekDayLabels; track d.date) {
                      <div class="hb-week-dot"
                        [class.hb-week-dot--done]="weekLogsFor(habit.id).has(d.date)"
                        [class.hb-week-dot--today]="d.isToday"
                        [title]="d.date">
                        @if (weekLogsFor(habit.id).has(d.date)) {
                          <span class="material-symbols-outlined">check</span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

      }
    </div>
  </div>
</div>

<!-- ── ADD / EDIT MODAL ── -->
@if (showForm()) {
  <div class="hb-overlay" (click)="closeForm()">
    <div class="hb-modal" (click)="$event.stopPropagation()">
      <div class="hb-modal-hdr">
        <span class="hb-modal-title">{{ editingId() ? 'Edit Habit' : 'New Habit' }}</span>
        <button class="hb-modal-close" (click)="closeForm()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="hb-modal-body">

        <!-- Preview avatar -->
        <div class="hb-preview-row">
          <div class="hb-preview-avatar" [style.background]="formColor()">
            <span class="material-symbols-outlined">{{ formIcon() }}</span>
          </div>
          <div class="hb-preview-name">{{ formName() || 'Habit name' }}</div>
        </div>

        <!-- Name -->
        <div class="hb-field">
          <label class="hb-field-lbl">Name</label>
          <input class="hb-field-input" type="text" placeholder="e.g. Morning run"
            [ngModel]="formName()" (ngModelChange)="formName.set($event)" autofocus>
        </div>

        <!-- Frequency -->
        <div class="hb-field">
          <label class="hb-field-lbl">Frequency</label>
          <div class="hb-seg">
            <button class="hb-seg-btn" [class.active]="formFrequency() === 'daily'"
              (click)="formFrequency.set('daily')">Daily</button>
            <button class="hb-seg-btn" [class.active]="formFrequency() === 'weekly'"
              (click)="formFrequency.set('weekly')">Weekly</button>
          </div>
        </div>

        <!-- Icon grid -->
        <div class="hb-field">
          <label class="hb-field-lbl">Icon</label>
          <div class="hb-icon-grid">
            @for (ic of iconOptions; track ic) {
              <button class="hb-icon-btn" [class.active]="formIcon() === ic" (click)="formIcon.set(ic)">
                <span class="material-symbols-outlined">{{ ic }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Color row -->
        <div class="hb-field">
          <label class="hb-field-lbl">Color</label>
          <div class="hb-color-row">
            @for (col of colorOptions; track col) {
              <button class="hb-color-swatch" [style.background]="col"
                [class.active]="formColor() === col"
                (click)="formColor.set(col)">
                @if (formColor() === col) {
                  <span class="material-symbols-outlined">check</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Description -->
        <div class="hb-field">
          <label class="hb-field-lbl">Description <span class="hb-opt">optional</span></label>
          <input class="hb-field-input" type="text" placeholder="What's this habit about?"
            [ngModel]="formDesc()" (ngModelChange)="formDesc.set($event)">
        </div>

      </div>
      <div class="hb-modal-ftr">
        <button class="hb-cancel-btn" (click)="closeForm()">Cancel</button>
        <button class="hb-save-btn" [disabled]="!formName().trim()" (click)="saveHabit()">
          <span class="material-symbols-outlined">{{ editingId() ? 'sync' : 'add_circle' }}</span>
          {{ editingId() ? 'Update Habit' : 'Add Habit' }}
        </button>
      </div>
    </div>
  </div>
}

<!-- Delete confirm -->
@if (confirmDelete(); as habitId) {
  <env-confirm-dialog
    [isOpen]="true"
    title="Delete Habit"
    icon="delete"
    variant="danger"
    confirmLabel="Delete"
    (confirmed)="doDelete(habitId)"
    (cancelled)="confirmDelete.set(null)">
    This habit and all its history will be permanently deleted.
  </env-confirm-dialog>
}
    `,
    styles: [`
    :host { display: flex; flex: 1 1 0; min-height: 0; overflow: hidden; }
    .hb-view { display: flex; flex: 1 1 0; min-height: 0; overflow: hidden; background: var(--bg-app); }

    /* ── Sidebar ── */
    .hb-sb-nav     { padding: 4px 6px; flex-shrink: 0; }
    .hb-sb-divider { height: 1px; background: var(--border-subtle); margin: 4px 8px; flex-shrink: 0; }
    .hb-sb-section-title {
      padding: 6px 14px 4px; font-size: 9.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary);
    }
    .hb-sb-item {
      width: 100%; display: flex; align-items: center; gap: 7px;
      padding: 5px 8px; background: transparent; border: none;
      border-radius: 6px; color: var(--text-secondary);
      font-size: 12.5px; font-weight: 500; cursor: pointer;
      transition: all 0.15s; text-align: left;
    }
    .hb-sb-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .hb-sb-item.active { background: var(--accent-primary-dim); color: var(--accent-primary); }
    .hb-sb-item .material-symbols-outlined { font-size: 16px; flex-shrink: 0; color: var(--text-tertiary); }
    .hb-sb-item.active .material-symbols-outlined { color: var(--accent-primary); }
    .hb-sb-label { flex: 1; }
    .hb-sb-count {
      font-size: 10.5px; color: var(--text-tertiary);
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 10px; padding: 0 5px; font-family: var(--font-mono);
      min-width: 16px; text-align: center;
    }
    .hb-sb-item.active .hb-sb-count {
      background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
      border-color: var(--accent-primary); color: var(--accent-primary);
    }

    /* ── Main ── */
    .hb-main { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }

    /* ── Toolbar ── */
    .hb-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      height: 44px; padding: 0 20px; gap: 8px;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0; background: var(--bg-panel);
    }
    .hb-toolbar-left { display: flex; align-items: center; gap: 10px; }
    .hb-date-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .hb-add-btn {
      height: 30px; padding: 0 12px; display: flex; align-items: center; gap: 5px;
      background: var(--accent-primary); color: var(--accent-primary-text);
      border: none; border-radius: 5px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
    }
    .hb-add-btn:hover { opacity: 0.88; }
    .hb-add-btn .material-symbols-outlined { font-size: 16px; }

    /* ── Progress ── */
    .hb-progress-wrap {
      padding: 10px 20px 8px; flex-shrink: 0;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-panel);
    }
    .hb-progress-track {
      height: 5px; background: var(--bg-hover); border-radius: 10px;
      overflow: hidden;
    }
    .hb-progress-fill {
      height: 100%; background: var(--accent-primary); border-radius: 10px;
      transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .hb-progress-meta {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 6px;
    }
    .hb-progress-text { font-size: 12px; color: var(--text-secondary); }
    .hb-progress-pct { font-size: 12px; font-weight: 700; color: var(--accent-primary); font-family: var(--font-mono); }

    /* ── List scroll ── */
    .hb-list-scroll { flex: 1 1 0; overflow-y: auto; padding: 16px 20px; }

    /* ── Habit list ── */
    .hb-list { display: flex; flex-direction: column; gap: 4px; max-width: 680px; }
    .hb-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 10px;
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      transition: border-color 0.15s, background 0.15s;
      cursor: default;
    }
    .hb-item:hover { border-color: var(--border-highlight); }
    .hb-item--done {
      background: color-mix(in srgb, var(--accent-primary) 4%, var(--bg-panel));
      border-color: color-mix(in srgb, var(--accent-primary) 20%, transparent);
    }
    .hb-item--archived { opacity: 0.7; }

    /* ── Check button ── */
    .hb-check {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      border: 2px solid var(--border-highlight); background: transparent;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s;
      color: transparent;
    }
    .hb-check:hover {
      border-color: var(--accent-primary);
      background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
    }
    .hb-check--done {
      background: var(--accent-primary); border-color: var(--accent-primary);
      color: var(--accent-primary-text);
    }
    .hb-check .material-symbols-outlined { font-size: 16px; display: block; }

    /* ── Avatar ── */
    .hb-avatar {
      width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .hb-avatar .material-symbols-outlined { font-size: 18px; color: #fff; display: block; }

    /* ── Info ── */
    .hb-info { flex: 1; min-width: 0; }
    .hb-name {
      font-size: 13.5px; font-weight: 600; color: var(--text-primary);
      transition: opacity 0.2s, text-decoration 0.2s;
    }
    .hb-name--done { opacity: 0.55; text-decoration: line-through; }
    .hb-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
    .hb-freq-badge {
      font-size: 10px; font-weight: 600; text-transform: capitalize;
      letter-spacing: 0.04em; color: var(--text-tertiary);
      background: var(--bg-hover); border: 1px solid var(--border-subtle);
      border-radius: 100px; padding: 1px 7px;
    }
    .hb-desc { font-size: 11.5px; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── Streak ── */
    .hb-streak {
      display: flex; align-items: center; gap: 3px;
      padding: 3px 8px; border-radius: 100px;
      background: var(--bg-hover); border: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .hb-streak--hot {
      background: color-mix(in srgb, #f97316 8%, transparent);
      border-color: color-mix(in srgb, #f97316 25%, transparent);
    }
    .hb-streak--sm { padding: 2px 6px; }
    .hb-streak-fire { font-size: 13px; line-height: 1; }
    .hb-streak-n { font-size: 12px; font-weight: 700; color: var(--text-secondary); font-family: var(--font-mono); }
    .hb-streak--hot .hb-streak-n { color: #f97316; }

    /* ── Actions (reveal on hover) ── */
    .hb-actions {
      display: flex; gap: 2px; opacity: 0;
      transition: opacity 0.15s; flex-shrink: 0;
    }
    .hb-item:hover .hb-actions { opacity: 1; }
    .hb-act-btn {
      background: transparent; border: none; color: var(--text-tertiary);
      cursor: pointer; padding: 4px; border-radius: 6px;
      display: flex; align-items: center; transition: all 0.12s;
    }
    .hb-act-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .hb-act-btn--danger:hover { background: color-mix(in srgb, #ef4444 10%, transparent); color: #ef4444; }
    .hb-act-btn .material-symbols-outlined { font-size: 15px; display: block; }

    /* ── Weekly view ── */
    .hb-week-section { max-width: 780px; }
    .hb-week-header {
      display: grid; grid-template-columns: 1fr repeat(7, 36px); gap: 4px;
      padding: 0 14px 8px; align-items: center;
      margin-left: 184px;
    }
    .hb-week-day {
      text-align: center; font-size: 10.5px; font-weight: 600;
      color: var(--text-tertiary); letter-spacing: 0.04em;
    }
    .hb-week-day--today { color: var(--accent-primary); }
    .hb-week-list { display: flex; flex-direction: column; gap: 4px; }
    .hb-week-row {
      display: flex; align-items: center; gap: 0;
      padding: 10px 14px; border-radius: 10px;
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
    }
    .hb-week-row:hover { border-color: var(--border-highlight); }
    .hb-week-info {
      display: flex; align-items: center; gap: 10px;
      width: 184px; flex-shrink: 0; min-width: 0;
    }
    .hb-week-avatar {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .hb-week-avatar .material-symbols-outlined { font-size: 15px; color: #fff; display: block; }
    .hb-week-name {
      flex: 1; font-size: 12.5px; font-weight: 600; color: var(--text-primary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .hb-week-dots { display: grid; grid-template-columns: repeat(7, 36px); gap: 4px; }
    .hb-week-dot {
      width: 30px; height: 30px; border-radius: 50%; margin: auto;
      display: flex; align-items: center; justify-content: center;
      border: 1.5px solid var(--border-subtle); background: transparent;
      color: transparent; transition: all 0.15s;
    }
    .hb-week-dot--done {
      background: var(--accent-primary); border-color: var(--accent-primary);
      color: var(--accent-primary-text);
    }
    .hb-week-dot--today:not(.hb-week-dot--done) {
      border-color: var(--accent-primary);
      border-style: dashed;
    }
    .hb-week-dot .material-symbols-outlined { font-size: 14px; display: block; }

    /* ── Modal ── */
    .hb-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: var(--z-modal);
    }
    .hb-modal {
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 14px; width: 440px; max-width: 95vw;
      display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .hb-modal-hdr {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border-subtle);
    }
    .hb-modal-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .hb-modal-close {
      background: transparent; border: none; color: var(--text-tertiary);
      cursor: pointer; padding: 4px; border-radius: 6px; display: flex;
      transition: all 0.12s;
    }
    .hb-modal-close:hover { background: var(--bg-hover); color: var(--text-primary); }
    .hb-modal-close .material-symbols-outlined { font-size: 18px; display: block; }
    .hb-modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; max-height: 70vh; }
    .hb-modal-ftr {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 14px 20px; border-top: 1px solid var(--border-subtle);
    }

    /* Preview row */
    .hb-preview-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; background: var(--bg-hover);
      border-radius: 10px; border: 1px solid var(--border-subtle);
    }
    .hb-preview-avatar {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .hb-preview-avatar .material-symbols-outlined { font-size: 20px; color: #fff; display: block; }
    .hb-preview-name { font-size: 14px; font-weight: 700; color: var(--text-primary); flex: 1; }

    /* Fields */
    .hb-field { display: flex; flex-direction: column; gap: 6px; }
    .hb-field-lbl {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--text-tertiary);
    }
    .hb-opt { font-size: 10px; font-weight: 400; color: var(--text-tertiary); text-transform: none; letter-spacing: 0; }
    .hb-field-input {
      background: var(--bg-app); border: 1px solid var(--border-subtle);
      border-radius: 7px; padding: 8px 12px; font-size: 13px;
      color: var(--text-primary); outline: none; transition: border-color 0.15s;
    }
    .hb-field-input:focus { border-color: var(--accent-primary); }

    /* Segmented frequency */
    .hb-seg {
      display: flex; border: 1px solid var(--border-subtle); border-radius: 7px;
      overflow: hidden; height: 34px;
    }
    .hb-seg-btn {
      flex: 1; background: transparent; border: none;
      border-right: 1px solid var(--border-subtle);
      color: var(--text-secondary); font-size: 12px; font-weight: 500;
      cursor: pointer; transition: all 0.15s;
    }
    .hb-seg-btn:last-child { border-right: none; }
    .hb-seg-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .hb-seg-btn.active { background: var(--accent-primary-dim); color: var(--accent-primary); font-weight: 600; }

    /* Icon grid */
    .hb-icon-grid {
      display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px;
    }
    .hb-icon-btn {
      aspect-ratio: 1; border-radius: 8px; border: 1.5px solid var(--border-subtle);
      background: var(--bg-app); cursor: pointer; display: flex;
      align-items: center; justify-content: center; transition: all 0.12s;
      color: var(--text-tertiary);
    }
    .hb-icon-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); background: var(--accent-primary-dim); }
    .hb-icon-btn.active { border-color: var(--accent-primary); color: var(--accent-primary); background: var(--accent-primary-dim); }
    .hb-icon-btn .material-symbols-outlined { font-size: 18px; display: block; }

    /* Color swatches */
    .hb-color-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .hb-color-swatch {
      width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid transparent;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.12s; flex-shrink: 0;
    }
    .hb-color-swatch.active { border-color: var(--text-primary); }
    .hb-color-swatch .material-symbols-outlined { font-size: 14px; color: #fff; display: block; }

    /* Footer buttons */
    .hb-cancel-btn {
      padding: 8px 16px; background: transparent; border: 1px solid var(--border-subtle);
      color: var(--text-secondary); border-radius: 7px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .hb-cancel-btn:hover { background: var(--bg-hover); }
    .hb-save-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 8px 16px; background: var(--accent-primary);
      color: var(--accent-primary-text); border: none; border-radius: 7px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
    }
    .hb-save-btn:hover { opacity: 0.88; }
    .hb-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .hb-save-btn .material-symbols-outlined { font-size: 15px; display: block; }
    `]
})
export class HabitsComponent {
    readonly store = inject(HabitStore);

    readonly iconOptions  = ICON_OPTIONS;
    readonly colorOptions = COLOR_OPTIONS;

    view = signal<ViewMode>('today');

    // Form state
    showForm      = signal(false);
    editingId     = signal<string | null>(null);
    formName      = signal('');
    formIcon      = signal(ICON_OPTIONS[0]);
    formColor     = signal(COLOR_OPTIONS[0]);
    formFrequency = signal<'daily' | 'weekly'>('daily');
    formDesc      = signal('');

    confirmDelete = signal<string | null>(null);

    visibleHabits = computed(() => {
        switch (this.view()) {
            case 'today':    return this.store.activeHabits();
            case 'all':      return this.store.activeHabits();
            case 'weekly':   return this.store.activeHabits();
            case 'archived': return this.store.archivedHabits();
        }
    });

    todayDone = computed(() =>
        this.store.activeHabits().filter(h => this.store.isCompletedToday(h.id)).length
    );

    todayProgressPct = computed(() => {
        const total = this.store.activeHabits().length;
        if (!total) return 0;
        return Math.round((this.todayDone() / total) * 100);
    });

    todayLabel = computed(() => {
        const d = new Date();
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    });

    weekDayLabels = (() => {
        const today = new Date();
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const isToday = i === 0;
            result.push({
                date:    this.localDateStr(d),
                label:   d.toLocaleDateString('en-US', { weekday: 'short' }),
                isToday,
            });
        }
        return result;
    })();

    weekLogsFor(habitId: string): Set<string> {
        return this.store.weekLogsFor(habitId);
    }

    openAddForm() {
        this.editingId.set(null);
        this.formName.set('');
        this.formIcon.set(ICON_OPTIONS[0]);
        this.formColor.set(COLOR_OPTIONS[0]);
        this.formFrequency.set('daily');
        this.formDesc.set('');
        this.showForm.set(true);
    }

    openEdit(habit: Habit) {
        this.editingId.set(habit.id);
        this.formName.set(habit.name);
        this.formIcon.set(habit.icon);
        this.formColor.set(habit.color);
        this.formFrequency.set(habit.frequency);
        this.formDesc.set(habit.description ?? '');
        this.showForm.set(true);
    }

    closeForm() { this.showForm.set(false); }

    async saveHabit() {
        const name = this.formName().trim();
        if (!name) return;

        const editId = this.editingId();
        if (editId) {
            await this.store.updateHabit(editId, {
                name,
                icon:        this.formIcon(),
                color:       this.formColor(),
                frequency:   this.formFrequency(),
                description: this.formDesc().trim() || undefined,
            });
        } else {
            const habit: Habit = {
                id:          crypto.randomUUID(),
                name,
                icon:        this.formIcon(),
                color:       this.formColor(),
                frequency:   this.formFrequency(),
                description: this.formDesc().trim() || undefined,
                createdAt:   new Date().toISOString(),
            };
            await this.store.addHabit(habit);
        }
        this.closeForm();
    }

    async doDelete(habitId: string) {
        await this.store.deleteHabit(habitId);
        this.confirmDelete.set(null);
    }

    private localDateStr(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
}
