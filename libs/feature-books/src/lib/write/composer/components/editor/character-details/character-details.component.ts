import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '@envello/core';

@Component({
  selector: 'app-character-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-details.component.html',
  styleUrls: [
    './character-details.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class CharacterDetailsComponent {
  character = input<Character | null>(null);

  updateField = output<{ id: string; field: string; value: string }>();
  addNewCharacter = output<void>();

  private static readonly PALETTE = [
    '#6366f1','#8b5cf6','#f97316','#14b8a6',
    '#3b82f6','#84cc16','#f43f5e','#f59e0b',
  ];

  avatarColor(name: string): string {
    const code = (name || '').charCodeAt(0) || 0;
    return CharacterDetailsComponent.PALETTE[code % CharacterDetailsComponent.PALETTE.length];
  }
}
