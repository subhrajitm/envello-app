import {
  Component, computed, inject, signal, OnInit, OnDestroy,
  ChangeDetectionStrategy, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '@envello/state';
import { JournalEntry, JournalMood } from '@envello/domain';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TiptapEditorDirective } from 'ngx-tiptap';

const MOODS: { value: JournalMood; emoji: string; label: string; color: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great',  color: '#10b981' },
  { value: 'good',  emoji: '🙂', label: 'Good',   color: '#3b82f6' },
  { value: 'okay',  emoji: '😐', label: 'Okay',   color: '#f59e0b' },
  { value: 'bad',   emoji: '😕', label: 'Bad',    color: '#f97316' },
  { value: 'awful', emoji: '😞', label: 'Awful',  color: '#ef4444' },
];

const PROMPTS = [
  'What are you grateful for today?',
  'What was the highlight of your day?',
  'What challenged you today, and what did you learn from it?',
  'What do you want to remember about today?',
  'How did you feel overall today, and why?',
  'What would you do differently if you could relive today?',
  'What small win can you celebrate from today?',
  'Who made a positive impact on your day?',
];

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalComponent implements OnInit, OnDestroy {
  private store = inject(StoreService);

  // ── Date navigation ───────────────────────────────────────────────────────
  selectedDate = signal(dateStr(new Date()));
  calendarMonth = signal(new Date().getMonth());
  calendarYear  = signal(new Date().getFullYear());

  // ── Editor state ──────────────────────────────────────────────────────────
  editor!: Editor;
  isSaving   = signal(false);
  lastSaved  = signal<Date | null>(null);
  wordCount  = signal(0);
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastLoadedDate = '';

  // ── UI toggles ────────────────────────────────────────────────────────────
  showPrompts    = signal(false);
  showMoodPicker = signal(false);
  promptIndex    = signal(Math.floor(Math.random() * PROMPTS.length));

  togglePrompts()    { this.showPrompts.update(v => !v); }
  toggleMoodPicker() { this.showMoodPicker.update(v => !v); }

  // ── Data ──────────────────────────────────────────────────────────────────
  readonly moods   = MOODS;
  readonly prompts = PROMPTS;

  // ── Computed ──────────────────────────────────────────────────────────────
  entries = this.store.journalEntries;

  selectedEntry = computed<JournalEntry | null>(() => {
    const d = this.selectedDate();
    return this.entries().find(e => e.date === d) ?? null;
  });

  selectedMood = computed(() => this.selectedEntry()?.mood ?? null);

  saveStatusLabel = computed(() => {
    if (this.isSaving()) return 'Saving…';
    const saved = this.lastSaved();
    if (!saved) return '';
    const diff = (Date.now() - saved.getTime()) / 1000;
    if (diff < 5) return 'Saved';
    return `Saved ${saved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });

  /** All dates that have a journal entry — for calendar dot indicators. */
  entryDates = computed(() => new Set(this.entries().map(e => e.date)));

  selectedDateLabel = computed(() => {
    const [y, m, d] = this.selectedDate().split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    const todayStr = dateStr(today);
    const sel = this.selectedDate();
    if (sel === todayStr) return 'Today';
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    if (sel === dateStr(yest)) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  });

  selectedDateSubLabel = computed(() => {
    const [y, m, d] = this.selectedDate().split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    const sel = this.selectedDate();
    const todayStr = dateStr(today);
    if (sel === todayStr) {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    return '';
  });

  calendarDays = computed(() => {
    const month = this.calendarMonth();
    const year  = this.calendarYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ date: string; day: number; inMonth: boolean } | null> = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({ date: dateStr(date), day: d, inMonth: true });
    }
    return days;
  });

  calendarMonthLabel = computed(() => {
    return new Date(this.calendarYear(), this.calendarMonth(), 1)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  recentEntries = computed(() =>
    [...this.entries()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)
  );

  todayStr = dateStr(new Date());
  readonly weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  currentPrompt = computed(() => PROMPTS[this.promptIndex()]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.editor = new Editor({
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        Placeholder.configure({ placeholder: 'Write about your day…' }),
        Link.configure({ openOnClick: false }),
        TaskList,
        TaskItem.configure({ nested: true }),
        CharacterCount,
        Underline,
        Highlight.configure({ multicolor: true }),
      ],
      editorProps: {
        attributes: { class: 'jn-editor-text focus:outline-none' },
      },
      onUpdate: ({ editor }) => {
        this.isSaving.set(true);
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(async () => {
          const content  = editor.getHTML();
          const words    = editor.storage['characterCount'].words() as number;
          this.wordCount.set(words);
          await this.saveContent(content, words);
          this.lastSaved.set(new Date());
          this.isSaving.set(false);
        }, 500);
      },
    });

    // Track word count on transaction (live)
    this.editor.on('transaction', () => {
      this.wordCount.set(this.editor.storage['characterCount'].words() as number);
    });

    // Load today's entry into the editor
    this.loadEntryIntoEditor(this.selectedDate());
  }

  ngOnDestroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.flushSave();
    }
    this.editor?.destroy();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  selectDate(date: string) {
    if (date > this.todayStr) return; // no future entries
    this.flushSave();
    this.selectedDate.set(date);
    this.lastLoadedDate = '';
    this.loadEntryIntoEditor(date);
  }

  goToToday() {
    this.selectedDate.set(this.todayStr);
    this.calendarMonth.set(new Date().getMonth());
    this.calendarYear.set(new Date().getFullYear());
    this.loadEntryIntoEditor(this.todayStr);
  }

  prevMonth() {
    let m = this.calendarMonth() - 1;
    let y = this.calendarYear();
    if (m < 0) { m = 11; y--; }
    this.calendarMonth.set(m);
    this.calendarYear.set(y);
  }

  nextMonth() {
    const now = new Date();
    let m = this.calendarMonth() + 1;
    let y = this.calendarYear();
    if (m > 11) { m = 0; y++; }
    // Don't navigate past current month
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return;
    this.calendarMonth.set(m);
    this.calendarYear.set(y);
  }

  isNextMonthDisabled(): boolean {
    const now = new Date();
    const m = this.calendarMonth(), y = this.calendarYear();
    return y === now.getFullYear() && m === now.getMonth();
  }

  isFutureDate(date: string): boolean {
    return date > this.todayStr;
  }

  // ── Mood ──────────────────────────────────────────────────────────────────
  setMood(mood: JournalMood) {
    const entry = this.ensureEntry();
    this.store.updateJournalEntry(entry.id, { mood });
    this.showMoodPicker.set(false);
  }

  clearMood() {
    const entry = this.selectedEntry();
    if (entry) this.store.updateJournalEntry(entry.id, { mood: undefined });
    this.showMoodPicker.set(false);
  }

  moodFor(value: JournalMood) {
    return MOODS.find(m => m.value === value);
  }

  // ── Prompts ───────────────────────────────────────────────────────────────
  nextPrompt() {
    this.promptIndex.update(i => (i + 1) % PROMPTS.length);
  }

  insertPrompt() {
    if (!this.editor) return;
    const text = this.currentPrompt();
    this.editor.chain().focus().insertContent(`<p><em>${text}</em></p><p></p>`).run();
    this.showPrompts.set(false);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  private ensureEntry(): JournalEntry {
    const date = this.selectedDate();
    const existing = this.entries().find(e => e.date === date);
    if (existing) return existing;
    const entry: JournalEntry = {
      id: date,
      date,
      createdAt: new Date().toISOString(),
    };
    this.store.upsertJournalEntry(entry);
    return entry;
  }

  private async saveContent(content: string, words: number) {
    const date = this.selectedDate();
    // Only save if there's actual text
    if (!content || content === '<p></p>') return;
    const existing = this.entries().find(e => e.date === date);
    if (existing) {
      this.store.updateJournalEntry(existing.id, { content, wordCount: words });
    } else {
      const entry: JournalEntry = {
        id: date,
        date,
        content,
        wordCount: words,
        createdAt: new Date().toISOString(),
      };
      this.store.upsertJournalEntry(entry);
    }
  }

  private flushSave() {
    if (!this.saveTimeout || !this.editor) return;
    clearTimeout(this.saveTimeout);
    this.saveTimeout = null;
    const content = this.editor.getHTML();
    const words   = this.editor.storage['characterCount'].words() as number;
    this.saveContent(content, words).catch(() => {});
  }

  private loadEntryIntoEditor(date: string) {
    if (this.lastLoadedDate === date) return;
    this.lastLoadedDate = date;
    const entry = this.entries().find(e => e.date === date);
    const content = entry?.content ?? '';
    if (this.editor) {
      this.editor.commands.setContent(content, { emitUpdate: false });
      this.wordCount.set(this.editor.storage['characterCount'].words() as number);
    }
    this.isSaving.set(false);
    this.lastSaved.set(null);
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  handleKeys(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
      const content = this.editor?.getHTML() ?? '';
      const words   = this.editor?.storage['characterCount'].words() as number ?? 0;
      this.isSaving.set(true);
      this.saveContent(content, words).then(() => {
        this.lastSaved.set(new Date());
        this.isSaving.set(false);
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (!t.closest('.jn-mood-wrap')) this.showMoodPicker.set(false);
  }

  formatEntryDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  entryWordCount(entry: JournalEntry): string {
    const w = entry.wordCount ?? 0;
    return w > 0 ? `${w}w` : '';
  }
}
