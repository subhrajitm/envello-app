import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../../../../../services/novel-content.service';

@Component({
  selector: 'app-character-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-details.component.html',
  styleUrls: [
    './character-details.component.css',
    '../../../novel-editor.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class CharacterDetailsComponent {
  character = input<Character | null>(null);
  
  updateField = output<{ id: string; field: string; value: string }>();
  addNewCharacter = output<void>();
}
