import { __decorate } from "tslib";
import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
let CharacterDetailsComponent = class CharacterDetailsComponent {
    character = input(null);
    updateField = output();
    addNewCharacter = output();
};
CharacterDetailsComponent = __decorate([
    Component({
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
], CharacterDetailsComponent);
export { CharacterDetailsComponent };
