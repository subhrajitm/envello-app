import { __decorate } from 'tslib';
import {
  Component,
  input,
  output,
  signal,
  inject,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NovelContentService } from '@envello/core';
let ChaptersListComponent = class ChaptersListComponent {
  novelService = inject(NovelContentService);
  chapters = input.required();
  activeChapterId = input.required();
  bulkMode = input.required();
  selectedChapters = input.required();
  addMenuOpen = input.required();
  selectChapter = output();
  toggleChapter = output();
  deleteChapter = output();
  deleteGroup = output();
  toggleBulkMode = output();
  bulkDelete = output();
  toggleAddMenu = output();
  addNewActOrPart = output();
  addNewChapter = output();
  toggleChapterSelection = output();
  // Drag & Drop
  dragStartIndex = signal(null);
  dragOverIndex = signal(null);
  onDragStart(event, index, type) {
    this.dragStartIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }
  onDragOver(event, index) {
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
  onDrop(event, dropIndex, type, groupId) {
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
};
ChaptersListComponent = __decorate(
  [
    Component({
      selector: 'app-chapters-list',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './chapters-list.component.html',
      styleUrls: [
        './chapters-list.component.css',
        '../../../novel-editor.component.css',
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
    }),
  ],
  ChaptersListComponent,
);
export { ChaptersListComponent };
