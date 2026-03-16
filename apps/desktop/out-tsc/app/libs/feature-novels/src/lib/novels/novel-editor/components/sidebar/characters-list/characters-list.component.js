import { __decorate } from 'tslib';
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
let CharactersListComponent = class CharactersListComponent {
  characters = input.required();
  selectedCharacterId = input.required();
  selectCharacter = output();
  deleteCharacter = output();
  addNewCharacter = output();
};
CharactersListComponent = __decorate(
  [
    Component({
      selector: 'app-characters-list',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './characters-list.component.html',
      styleUrls: [
        './characters-list.component.css',
        '../../../novel-editor.component.css',
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
    }),
  ],
  CharactersListComponent,
);
export { CharactersListComponent };
