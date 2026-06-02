import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { Character } from '@envello/core';
import { avatarColor } from '../../../utils/avatar-color.util';

@Component({
  selector: 'app-character-details',
  standalone: true,
  imports: [],
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

  readonly avatarColor = avatarColor;
}
