import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../../../../../services/novel-content.service';

@Component({
  selector: 'app-characters-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './characters-list.component.html',
  styleUrls: [
    './characters-list.component.css',
    '../../../novel-editor.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class CharactersListComponent {
  characters = input.required<Character[]>();
  selectedCharacterId = input.required<string | null>();
  
  selectCharacter = output<string>();
  deleteCharacter = output<{ id: string; name?: string }>();
  addNewCharacter = output<void>();
}
