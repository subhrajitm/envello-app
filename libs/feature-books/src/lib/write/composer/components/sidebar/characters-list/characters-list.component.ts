import { Component, input, output, signal, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Character } from '@envello/core';

@Component({
  selector: 'app-characters-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './characters-list.component.html',
  styleUrls: [
    './characters-list.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class CharactersListComponent {
  characters = input.required<Character[]>();
  selectedCharacterId = input.required<string | null>();
  showHeader = input<boolean>(true);

  selectCharacter = output<string>();
  deleteCharacter = output<{ id: string; name?: string }>();
  addNewCharacter = output<void>();
  renameCharacter = output<{ id: string; name: string }>();

  renamingId = signal<string | null>(null);
  renameValue = signal('');

  startRename(char: Character, event: Event) {
    event.stopPropagation();
    this.renamingId.set(char.id);
    this.renameValue.set(char.name);
  }

  commitRename(id: string) {
    const name = this.renameValue().trim();
    if (name) this.renameCharacter.emit({ id, name });
    this.renamingId.set(null);
  }

  cancelRename() {
    this.renamingId.set(null);
  }
}
