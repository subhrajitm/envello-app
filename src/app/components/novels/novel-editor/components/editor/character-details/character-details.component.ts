import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../../../../services/novel-content.service';

@Component({
  selector: 'app-character-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-details.component.html',
  styleUrl: './character-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharacterDetailsComponent {
  character = input<Character | null>(null);
  
  updateField = output<{ id: string; field: string; value: string }>();
  addNewCharacter = output<void>();
}
