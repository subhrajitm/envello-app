import {
  Component, computed, inject, signal, HostListener, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '@envello/state';
import { Reminder, ReminderRepeat, ReminderStatus } from '@envello/domain';

type FilterKey = 'all' | 'today' | 'upcoming' | 'overdue' | 'done';

interface FilterDef { key: FilterKey; label: string; icon: string }

const FILTERS: FilterDef[] = [
  { key: 'all',      label: 'All',      icon: 'notifications' },
  { key: 'today',    label: 'Today',    icon: 'today' },
  { key: 'upcoming', label: 'Upcoming', icon: 'upcoming' },
  { key: 'overdue',  label: 'Overdue',  icon: 'warning' },
  { key: 'done',     label: 'Done',     icon: 'check_circle' },
];

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function weekEndStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d.toISOString().split('T')[0];
}

function dueDateStr(dueAt: string): string {
  return dueAt.split('T')[0];
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reminders.component.html',
  styleUrl: './reminders.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemindersComponent implements AfterViewInit {
  @ViewChild('titleInput') titleInputRef?: ElementRef<HTMLInputElement>;

  private store = inject(StoreService);

  readonly filters = FILTERS;

  activeFilter = signal<FilterKey>('all');
  searchQuery  = signal('');
  activeTag    = signal<string | null>(null);

  showForm   = signal(false);
  editingId  = signal<string | null>(null);

  // Form fields
  formTitle    = signal('');
  formDueDate  = signal(defaultDueDate());
  formDueTime  = signal('09:00');
  formNotes    = signal('');
  formRepeat   = signal<ReminderRepeat>('none');
  formPriority = signal<'high' | 'medium' | 'low' | ''>('');
  formTags     = signal('');

  reminders = this.store.reminders;

  allTags = computed(() => {
    const tags = new Set<string>();
    this.reminders().forEach(r => r.tags?.forEach(t => tags.add(t)));
    return [...tags].sort();
  });

  private pending = computed(() => this.reminders().filter(r => !r.deleted_at && r.status !== 'done'));
  private done    = computed(() => this.reminders().filter(r => !r.deleted_at && r.status === 'done'));

  counts = computed(() => {
    const today = todayStr();
    const p = this.pending();
    return {
      all:      p.length,
      today:    p.filter(r => dueDateStr(r.dueAt) === today).length,
      upcoming: p.filter(r => dueDateStr(r.dueAt) > today).length,
      overdue:  p.filter(r => dueDateStr(r.dueAt) < today).length,
      done:     this.done().length,
    };
  });

  filteredReminders = computed(() => {
    const filter  = this.activeFilter();
    const q       = this.searchQuery().toLowerCase().trim();
    const tag     = this.activeTag();
    const today   = todayStr();

    let items = filter === 'done' ? this.done() : this.pending();

    if (filter === 'today')    items = items.filter(r => dueDateStr(r.dueAt) === today);
    if (filter === 'overdue')  items = items.filter(r => dueDateStr(r.dueAt) < today);
    if (filter === 'upcoming') items = items.filter(r => dueDateStr(r.dueAt) > today);

    if (tag) items = items.filter(r => r.tags?.includes(tag));
    if (q)   items = items.filter(r =>
      r.title.toLowerCase().includes(q) || r.notes?.toLowerCase().includes(q)
    );

    return items;
  });

  groups = computed(() => {
    const filter = this.activeFilter();
    const items  = this.filteredReminders();

    if (filter !== 'all') return [{ label: '', items, isOverdue: false, isDone: filter === 'done' }];

    const today   = todayStr();
    const tmr     = tomorrowStr();
    const weekEnd = weekEndStr();

    const overdue  = items.filter(r => dueDateStr(r.dueAt) < today);
    const todayI   = items.filter(r => dueDateStr(r.dueAt) === today);
    const tmrI     = items.filter(r => dueDateStr(r.dueAt) === tmr);
    const weekI    = items.filter(r => { const d = dueDateStr(r.dueAt); return d > tmr && d <= weekEnd; });
    const laterI   = items.filter(r => dueDateStr(r.dueAt) > weekEnd);
    const doneI    = this.done().filter(r => {
      const tag = this.activeTag();
      const q   = this.searchQuery().toLowerCase().trim();
      if (tag && !r.tags?.includes(tag)) return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.notes?.toLowerCase().includes(q)) return false;
      return true;
    });

    const gs: { label: string; items: Reminder[]; isOverdue: boolean; isDone: boolean }[] = [];
    if (overdue.length) gs.push({ label: 'Overdue',    items: overdue, isOverdue: true,  isDone: false });
    if (todayI.length)  gs.push({ label: 'Today',      items: todayI,  isOverdue: false, isDone: false });
    if (tmrI.length)    gs.push({ label: 'Tomorrow',   items: tmrI,    isOverdue: false, isDone: false });
    if (weekI.length)   gs.push({ label: 'This Week',  items: weekI,   isOverdue: false, isDone: false });
    if (laterI.length)  gs.push({ label: 'Later',      items: laterI,  isOverdue: false, isDone: false });
    if (doneI.length)   gs.push({ label: 'Done',       items: doneI,   isOverdue: false, isDone: true  });
    if (!gs.length)     gs.push({ label: '',            items: [],      isOverdue: false, isDone: false });
    return gs;
  });

  isEmpty = computed(() => this.filteredReminders().length === 0 && this.groups().every(g => !g.items.length));

  ngAfterViewInit() { /* focus is handled reactively after showForm flip */ }

  openAdd() {
    this.editingId.set(null);
    this.formTitle.set('');
    this.formDueDate.set(defaultDueDate());
    this.formDueTime.set('09:00');
    this.formNotes.set('');
    this.formRepeat.set('none');
    this.formPriority.set('');
    this.formTags.set('');
    this.showForm.set(true);
    setTimeout(() => this.titleInputRef?.nativeElement.focus(), 50);
  }

  openEdit(r: Reminder) {
    this.editingId.set(r.id);
    this.formTitle.set(r.title);
    const [date, timePart] = r.dueAt.split('T');
    this.formDueDate.set(date);
    this.formDueTime.set(timePart?.slice(0, 5) ?? '09:00');
    this.formNotes.set(r.notes ?? '');
    this.formRepeat.set(r.repeat);
    this.formPriority.set(r.priority ?? '');
    this.formTags.set(r.tags?.join(', ') ?? '');
    this.showForm.set(true);
    setTimeout(() => this.titleInputRef?.nativeElement.focus(), 50);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  saveForm() {
    const title = this.formTitle().trim();
    if (!title) return;

    const dueAt  = `${this.formDueDate()}T${this.formDueTime()}:00`;
    const tags   = this.formTags().split(',').map(t => t.trim()).filter(Boolean);
    const prio   = this.formPriority();

    const editId = this.editingId();
    if (editId) {
      this.store.updateReminder(editId, {
        title,
        dueAt,
        notes:    this.formNotes().trim() || undefined,
        repeat:   this.formRepeat(),
        priority: (prio as 'high' | 'medium' | 'low') || undefined,
        tags:     tags.length ? tags : undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const reminder: Reminder = {
        id:       crypto.randomUUID(),
        title,
        dueAt,
        notes:    this.formNotes().trim() || undefined,
        repeat:   this.formRepeat(),
        priority: (prio as 'high' | 'medium' | 'low') || undefined,
        status:   'pending',
        tags:     tags.length ? tags : undefined,
        createdAt: new Date().toISOString(),
      };
      this.store.addReminder(reminder);
    }
    this.closeForm();
  }

  toggleDone(r: Reminder, event: Event) {
    event.stopPropagation();
    const newStatus: ReminderStatus = r.status === 'done' ? 'pending' : 'done';
    this.store.updateReminder(r.id, { status: newStatus });
  }

  deleteReminder(r: Reminder, event: Event) {
    event.stopPropagation();
    this.store.deleteReminder(r.id);
  }

  setFilter(f: FilterKey) {
    this.activeFilter.set(f);
    this.activeTag.set(null);
  }

  setTagFilter(tag: string) {
    if (this.activeTag() === tag) {
      this.activeTag.set(null);
    } else {
      this.activeTag.set(tag);
      this.activeFilter.set('all');
    }
  }

  formatDue(dueAt: string): string {
    const date   = new Date(dueAt);
    const today  = new Date();
    const tMid   = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dMid   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff   = Math.round((dMid.getTime() - tMid.getTime()) / 86400000);
    const time   = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diff === 0)  return `Today · ${time}`;
    if (diff === 1)  return `Tomorrow · ${time}`;
    if (diff === -1) return `Yesterday · ${time}`;
    if (diff < -1)   return `${Math.abs(diff)}d ago · ${time}`;
    if (diff <= 7)   return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` · ${time}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ` · ${time}`;
  }

  repeatLabel(r: ReminderRepeat): string {
    const map: Record<ReminderRepeat, string> = {
      none: '', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
    };
    return map[r];
  }

  priorityColor(p: string | undefined): string {
    if (p === 'high')   return 'var(--color-error, #ef4444)';
    if (p === 'medium') return 'var(--color-warning, #f59e0b)';
    if (p === 'low')    return 'var(--accent-primary)';
    return 'transparent';
  }

  isOverdue(r: Reminder): boolean {
    return dueDateStr(r.dueAt) < todayStr() && r.status !== 'done';
  }

  onSearchInput(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.showForm()) { this.closeForm(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && this.showForm()) { this.saveForm(); }
  }
}
