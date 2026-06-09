import { Component, input, output, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '@envello/ui';

export type ExportFormat = 'pdf' | 'docx' | 'html' | 'md' | 'fountain';

export interface ExportRequest {
  scopeKeys: string[];
  format: ExportFormat;
}

export type ChapterStatus = 'DRAFT' | 'EDITING' | 'DONE' | 'EMPTY';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './export-modal.component.html',
  styleUrl: './export-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportModalComponent implements OnInit {
  chapters = input<{
    groupId: string; groupTitle: string; wordCount: number;
    items: { id: string; title: string; wordCount: number; status: ChapterStatus }[];
  }[]>([]);
  frontMatter = input<{ id: string; title: string; type: string; wordCount: number }[]>([]);
  prologue    = input<{ title: string; wordCount: number } | null>(null);
  writingType  = input<string>('NOVEL');
  activeItemId = input<string | null>(null);
  sectionLabel = input<string>('Chapters');

  exportRequest = output<ExportRequest>();
  cancel        = output<void>();

  selectedKeys   = signal<Set<string>>(new Set(['book']));
  selectedFormat = signal<ExportFormat>('pdf');

  ngOnInit() {
    const id = this.activeItemId();
    const initial = id ? (id === 'prologue' ? 'prologue' : `item:${id}`) : 'book';
    this.selectedKeys.set(new Set([initial]));
  }

  isSelected(key: string): boolean {
    return this.selectedKeys().has(key);
  }

  toggle(key: string) {
    const current = new Set(this.selectedKeys());
    if (key === 'book') {
      current.has('book') ? current.delete('book') : (current.clear(), current.add('book'));
    } else {
      current.delete('book');
      current.has(key) ? current.delete(key) : current.add(key);
    }
    this.selectedKeys.set(current);
  }

  selectAll() {
    const keys = new Set<string>();
    for (const fm of this.frontMatter()) keys.add(`item:${fm.id}`);
    if (this.prologue()) keys.add('prologue');
    for (const g of this.chapters()) for (const c of g.items) keys.add(`item:${c.id}`);
    this.selectedKeys.set(keys);
  }

  totalChapterCount = computed(() => this.chapters().reduce((s, g) => s + g.items.length, 0));
  totalChapterWords = computed(() => this.chapters().reduce((s, g) => s + g.wordCount, 0));

  totalWordCount = computed(() => {
    let total = 0;
    for (const fm of this.frontMatter()) total += fm.wordCount;
    if (this.prologue()) total += this.prologue()!.wordCount;
    for (const g of this.chapters()) for (const c of g.items) total += c.wordCount;
    return total;
  });

  selectedWordCount = computed(() => {
    const keys = this.selectedKeys();
    if (keys.has('book')) return this.totalWordCount();
    let total = 0;
    for (const fm of this.frontMatter()) { if (keys.has(`item:${fm.id}`)) total += fm.wordCount; }
    if (this.prologue() && keys.has('prologue')) total += this.prologue()!.wordCount;
    for (const g of this.chapters()) for (const c of g.items) { if (keys.has(`item:${c.id}`)) total += c.wordCount; }
    return total;
  });

  selectionSummary = computed(() => {
    const keys = this.selectedKeys();
    const wc = this.fmtWc(this.selectedWordCount());
    if (keys.has('book')) return `Whole Book${wc ? ' · ' + wc : ''}`;
    if (keys.size === 0) return 'Nothing selected';
    const label = keys.size === 1 ? '1 item' : `${keys.size} items`;
    return wc ? `${label} · ${wc}` : label;
  });

  canExport = computed(() => this.selectedKeys().size > 0);

  flatRows = computed<{
    key: string; title: string; section: string;
    wordCount: number; status?: ChapterStatus; isBook?: boolean; isSep?: boolean;
  }[]>(() => {
    const rows: { key: string; title: string; section: string; wordCount: number; status?: ChapterStatus; isBook?: boolean; isSep?: boolean }[] = [];
    rows.push({ key: 'book', title: 'Whole Book', section: '', wordCount: this.totalWordCount(), isBook: true });
    rows.push({ key: '__sep__', title: '', section: '', wordCount: 0, isSep: true });
    for (const fm of this.frontMatter()) {
      rows.push({ key: `item:${fm.id}`, title: fm.title, section: 'Front Matter', wordCount: fm.wordCount });
    }
    if (this.prologue()) {
      rows.push({ key: 'prologue', title: this.prologue()!.title || 'Prologue', section: 'Prologue', wordCount: this.prologue()!.wordCount });
    }
    for (const g of this.chapters()) {
      for (const c of g.items) {
        rows.push({ key: `item:${c.id}`, title: c.title, section: g.groupTitle, wordCount: c.wordCount, status: c.status });
      }
    }
    return rows;
  });

  formats = computed<{ key: ExportFormat; label: string; icon: string }[]>(() => {
    const base: { key: ExportFormat; label: string; icon: string }[] = [
      { key: 'pdf',  label: 'PDF',      icon: 'picture_as_pdf' },
      { key: 'docx', label: 'Word',     icon: 'article' },
      { key: 'html', label: 'HTML',     icon: 'code' },
      { key: 'md',   label: 'Markdown', icon: 'description' },
    ];
    if (this.writingType() === 'SCRIPT') {
      base.push({ key: 'fountain', label: 'Fountain', icon: 'theaters' });
    }
    return base;
  });

  fmtWc(n: number): string {
    if (!n) return '';
    if (n < 1000) return `${n} words`;
    return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k words`;
  }

  statusClass(status: ChapterStatus): string {
    return { DONE: 'done', EDITING: 'editing', DRAFT: 'draft', EMPTY: 'empty' }[status] ?? 'empty';
  }

  onExport() {
    this.exportRequest.emit({ scopeKeys: Array.from(this.selectedKeys()), format: this.selectedFormat() });
  }
}
