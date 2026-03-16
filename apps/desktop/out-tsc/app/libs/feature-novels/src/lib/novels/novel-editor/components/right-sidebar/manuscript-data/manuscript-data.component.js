import { __decorate } from 'tslib';
import {
  Component,
  input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
let ManuscriptDataComponent = class ManuscriptDataComponent {
  totalNovelWords = input.required();
  averageChapterLength = input.required();
  chaptersCompleted = input.required();
  totalChapters = input.required();
  logline = input('');
  theme = input('');
  wordCount = input.required();
  targetWordCount = input.required();
  goalProgress = input.required();
  activeChapterId = input(null);
  mentionedCharacters = input.required();
  mentionedLocations = input.required();
};
ManuscriptDataComponent = __decorate(
  [
    Component({
      selector: 'app-manuscript-data',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './manuscript-data.component.html',
      styleUrls: [
        './manuscript-data.component.css',
        '../../../novel-editor.component.css',
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
    }),
  ],
  ManuscriptDataComponent,
);
export { ManuscriptDataComponent };
