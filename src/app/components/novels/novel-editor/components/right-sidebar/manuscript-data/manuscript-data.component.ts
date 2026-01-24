import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manuscript-data',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manuscript-data.component.html',
  styleUrl: './manuscript-data.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
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
}
