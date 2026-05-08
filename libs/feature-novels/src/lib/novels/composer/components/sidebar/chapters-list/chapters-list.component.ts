import { Component, input, output, signal, computed, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NovelContentService, Chapter, ChapterGroup } from '@envello/core';

@Component({
  selector: 'app-chapters-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chapters-list.component.html',
  styleUrls: [
    './chapters-list.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ChaptersListComponent {
  protected novelService = inject(NovelContentService);
  
  chapters = input.required<ChapterGroup[]>();
  activeChapterId = input.required<string | null>();
  bulkMode = input.required<boolean>();
  selectedChapters = input.required<Set<string>>();
  addMenuOpen = input.required<boolean>();
  sectionLabel = input<string>('Chapters');
  
  selectChapter = output<Chapter>();
  toggleChapter = output<ChapterGroup>();
  deleteChapter = output<{ id: string; title?: string }>();
  deleteGroup = output<{ id: string; title?: string }>();
  renameChapter = output<{ id: string; title: string }>();
  toggleBulkMode = output<void>();
  bulkDelete = output<void>();
  toggleAddMenu = output<void>();
  addNewActOrPart = output<void>();
  addNewChapter = output<void>();
  toggleChapterSelection = output<string>();

  // Inline rename state
  renamingChapterId = signal<string | null>(null);
  renameValue = signal('');

  startRename(chap: Chapter, event: Event) {
    event.stopPropagation();
    this.renamingChapterId.set(chap.id);
    this.renameValue.set(chap.title);
  }

  commitRename(id: string) {
    const title = this.renameValue().trim();
    if (title) this.renameChapter.emit({ id, title });
    this.renamingChapterId.set(null);
  }

  cancelRename() {
    this.renamingChapterId.set(null);
  }
  
  // Drag & Drop
  dragStartIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);
  
  onDragStart(event: DragEvent, index: number, type: 'chapter' | 'group') {
    this.dragStartIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    this.dragOverIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragEnd() {
    this.dragStartIndex.set(null);
    this.dragOverIndex.set(null);
  }

  onDrop(event: DragEvent, dropIndex: number, type: 'chapter' | 'group', groupId?: string) {
    event.preventDefault();
    const startIndex = this.dragStartIndex();
    if (startIndex === null || startIndex === dropIndex) {
      this.onDragEnd();
      return;
    }

    if (type === 'group') {
      this.novelService.reorderChapterGroup(startIndex, dropIndex);
    } else if (type === 'chapter' && groupId) {
      this.novelService.reorderChapter(groupId, startIndex, dropIndex);
    }

    this.onDragEnd();
  }
}
