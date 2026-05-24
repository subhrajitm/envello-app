import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manuscript-data',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manuscript-data.component.html',
  styleUrls: [
    './manuscript-data.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ManuscriptDataComponent {
  totalNovelWords = input.required<number>();
  averageChapterLength = input.required<number>();
  chaptersCompleted = input.required<number>();
  totalChapters = input.required<number>();
  logline = input<string>('');
  theme = input<string>('');
  wordCount = input.required<number>();
  targetWordCount = input.required<number>();
  goalProgress = input.required<number>();
  activeChapterId = input<string | null>(null);
  mentionedCharacters = input.required<string[]>();
  mentionedLocations = input.required<string[]>();
  writingType = input<string>('NOVEL');
  sectionLabel = input<string>('Section');

  get readingTime() { return Math.max(1, Math.ceil(this.totalNovelWords() / 200)); }
  get estimatedPages() { return Math.max(1, Math.ceil(this.totalNovelWords() / 250)); }
}
