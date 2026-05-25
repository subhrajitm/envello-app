import { Component, input, output, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookContentService, Chapter, ChapterGroup } from '@envello/core';

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
  protected bookService = inject(BookContentService);
  
  chapters = input.required<ChapterGroup[]>();
  activeChapterId = input.required<string | null>();
  bulkMode = input.required<boolean>();
  selectedChapters = input.required<Set<string>>();
  addMenuOpen = input.required<boolean>();
  sectionLabel = input<string>('Chapters');
  showHeader = input<boolean>(true);
  
  selectChapter = output<Chapter>();
  toggleChapter = output<ChapterGroup>();
  deleteChapter = output<{ id: string; title?: string }>();
  deleteGroup = output<{ id: string; title?: string }>();
  renameChapter = output<{ id: string; title: string }>();
  renameGroup = output<{ id: string; title: string }>();
  toggleBulkMode = output<void>();
  bulkDelete = output<void>();
  bulkMove = output<void>();
  toggleAddMenu = output<void>();
  addNewActOrPart = output<void>();
  addNewChapter = output<void>();
  toggleChapterSelection = output<string>();

  // Inline rename state
  renamingChapterId = signal<string | null>(null);
  renamingGroupId = signal<string | null>(null);
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
    this.renamingGroupId.set(null);
  }

  startGroupRename(group: ChapterGroup, event: Event) {
    event.stopPropagation();
    this.renamingGroupId.set(group.id);
    this.renameValue.set(group.title);
  }

  commitGroupRename(id: string) {
    const title = this.renameValue().trim();
    if (title) this.renameGroup.emit({ id, title });
    this.renamingGroupId.set(null);
  }

  // Drag & Drop — dataTransfer carries source state; signals are only for visual feedback
  dragType              = signal<'group' | 'chapter' | null>(null);
  groupDragOverIndex    = signal<number | null>(null);
  chapterDragOverIndex  = signal<number | null>(null);
  chapterDragOverGroupId = signal<string | null>(null);

  private setDragData(event: DragEvent, data: object) {
    event.dataTransfer?.setData('text/plain', JSON.stringify(data));
  }

  private getDragData(event: DragEvent): Record<string, any> {
    try { return JSON.parse(event.dataTransfer?.getData('text/plain') ?? '{}'); }
    catch { return {}; }
  }

  onGroupDragStart(event: DragEvent, index: number) {
    this.dragType.set('group');
    this.setDragData(event, { type: 'group', index });
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onChapterDragStart(event: DragEvent, index: number, groupId: string) {
    event.stopPropagation();
    this.dragType.set('chapter');
    const chapterId = this.chapters().find(g => g.id === groupId)?.children[index]?.id ?? '';
    this.setDragData(event, { type: 'chapter', index, groupId, chapterId });
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onGroupDragOver(event: DragEvent, index: number) {
    // Accept both group reorders and chapter cross-group moves
    if (this.dragType() !== 'group' && this.dragType() !== 'chapter') return;
    event.preventDefault();
    this.groupDragOverIndex.set(index);
  }

  onChapterDragOver(event: DragEvent, index: number, groupId: string) {
    event.stopPropagation();
    if (this.dragType() !== 'chapter') return; // only chapter drags land on chapter slots
    event.preventDefault();
    this.chapterDragOverIndex.set(index);
    this.chapterDragOverGroupId.set(groupId);
  }

  onGroupDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    const data = this.getDragData(event);

    if (data['type'] === 'chapter') {
      // Chapter dropped on a group header — append to end of that group
      const chapterId: string = data['chapterId'];
      const sourceGroupId: string = data['groupId'];
      const targetGroup = this.chapters()[dropIndex];
      if (targetGroup && sourceGroupId !== targetGroup.id) {
        this.bookService.moveChapterBetweenGroups(chapterId, targetGroup.id, targetGroup.children.length);
      } else if (targetGroup && sourceGroupId === targetGroup.id) {
        // Same group — reorder to end
        const startIndex: number = data['index'];
        const endIndex = targetGroup.children.length - 1;
        if (startIndex !== endIndex) {
          this.bookService.reorderChapter(targetGroup.id, startIndex, endIndex);
        }
      }
    } else if (data['type'] === 'group') {
      const startIndex = data['index'] as number;
      if (startIndex !== dropIndex) {
        this.bookService.reorderChapterGroup(startIndex, dropIndex);
      }
    }
    this.onDragEnd();
  }

  onChapterDrop(event: DragEvent, dropIndex: number, targetGroupId: string) {
    event.preventDefault();
    event.stopPropagation();
    const data = this.getDragData(event);
    if (data['type'] !== 'chapter') { this.onDragEnd(); return; }

    const chapterId: string = data['chapterId'];
    const sourceGroupId: string = data['groupId'];
    const startIndex: number = data['index'];

    if (sourceGroupId === targetGroupId) {
      if (startIndex !== dropIndex) {
        this.bookService.reorderChapter(targetGroupId, startIndex, dropIndex);
      }
    } else {
      this.bookService.moveChapterBetweenGroups(chapterId, targetGroupId, dropIndex);
    }
    this.onDragEnd();
  }

  onDragEnd() {
    this.dragType.set(null);
    this.groupDragOverIndex.set(null);
    this.chapterDragOverIndex.set(null);
    this.chapterDragOverGroupId.set(null);
  }
}
