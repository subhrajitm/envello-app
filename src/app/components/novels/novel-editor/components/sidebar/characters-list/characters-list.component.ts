import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../../../../services/novel-content.service';

@Component({
  selector: 'app-characters-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './characters-list.component.html',
  styleUrl: './characters-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharactersListComponent {
  characters = input.required<Character[]>();
  selectedCharacterId = input.required<string | null>();
  
  selectCharacter = output<string>();
  deleteCharacter = output<{ id: string; name?: string }>();
  addNewCharacter = output<void>();
}
