import { Component, input, output, signal, effect, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteHistoryService } from '@envello/core';
import { NoteHistoryEntry } from '@envello/domain';

@Component({
  selector: 'env-note-history-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-history-panel.component.html',
  styleUrl: './note-history-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteHistoryPanelComponent {
  private historyService = inject(NoteHistoryService);
  private cdr            = inject(ChangeDetectorRef);

  noteId   = input<string>('');
  isOpen   = input<boolean>(false);
  closed   = output<void>();
  restored = output<void>();
  saveNow  = output<void>();

  entries  = signal<NoteHistoryEntry[]>([]);
  selected = signal<NoteHistoryEntry | null>(null);
  loading  = signal(false);
  saving   = signal(false);
  manualLabel = signal('');
  confirmDeleteId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.noteId();
      const open = this.isOpen();
      if (open && id) this.loadHistory(id);
    });
  }

  async loadHistory(noteId: string) {
    this.loading.set(true);
    this.selected.set(null);
    try {
      const entries = await this.historyService.getHistory(noteId);
      this.entries.set(entries);
    } finally {
      this.loading.set(false);
      this.saving.set(false);
      this.cdr.markForCheck();
    }
  }

  triggerSave() {
    if (this.saving()) return;
    this.saving.set(true);
    this.saveNow.emit();
  }

  select(entry: NoteHistoryEntry) {
    this.selected.set(entry);
    this.confirmDeleteId.set(null);
  }

  async restore() {
    const entry = this.selected();
    if (!entry) return;
    await this.historyService.restore(entry);
    this.restored.emit();
    this.close();
  }

  confirmDelete(id: string) {
    this.confirmDeleteId.set(id);
  }

  async deleteSnapshot(id: string) {
    await this.historyService.deleteSnapshot(id);
    this.confirmDeleteId.set(null);
    if (this.selected()?.id === id) this.selected.set(null);
    await this.loadHistory(this.noteId());
  }

  close() {
    this.selected.set(null);
    this.confirmDeleteId.set(null);
    this.manualLabel.set('');
    this.closed.emit();
  }

  formatDate(iso: string): string {
    return this.historyService.formatDate(iso);
  }

  previewText(content: string): string {
    const text = content.replace(/<[^>]*>/g, '');
    return text.length > 80 ? text.substring(0, 80) + '…' : text;
  }
}
