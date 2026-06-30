import { Component, input, output, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionHistoryService, VersionSnapshot } from '@envello/core';

@Component({
  selector: 'app-version-history-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-history-modal.component.html',
  styleUrls: ['./version-history-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class VersionHistoryModalComponent {
  isOpen    = input.required<boolean>();
  versions  = input.required<VersionSnapshot[]>();

  restore         = output<string>();
  close           = output<void>();
  saveNow         = output<void>();
  deleteSnapshot  = output<{ id: string; contentId: string; contentType: string }>();

  selected       = signal<VersionSnapshot | null>(null);
  confirmDeleteId = signal<string | null>(null);

  protected vhs = inject(VersionHistoryService);

  select(v: VersionSnapshot) {
    this.selected.set(v);
    this.confirmDeleteId.set(null);
  }

  onRestore() {
    const v = this.selected();
    if (v) { this.restore.emit(v.id); this.selected.set(null); }
  }

  confirmDelete(id: string) { this.confirmDeleteId.set(id); }

  onDelete(v: VersionSnapshot) {
    this.deleteSnapshot.emit({ id: v.id, contentId: v.contentId, contentType: v.contentType });
    if (this.selected()?.id === v.id) this.selected.set(null);
    this.confirmDeleteId.set(null);
  }

  onClose() { this.selected.set(null); this.confirmDeleteId.set(null); this.close.emit(); }

  previewText(content: string): string {
    return content.replace(/<[^>]*>/g, '').substring(0, 70) + '…';
  }

  isCurrent(v: VersionSnapshot): boolean {
    const all = this.versions();
    return all.length > 0 && all[all.length - 1].id === v.id;
  }
}
