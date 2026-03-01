import { __decorate } from "tslib";
import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
let EditorToolbarComponent = class EditorToolbarComponent {
    editor = input.required();
    openLinkModal = output();
    addImage = output();
    insertTable = output();
    addYoutube = output();
};
EditorToolbarComponent = __decorate([
    Component({
        selector: 'app-editor-toolbar',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './editor-toolbar.component.html',
        styleUrls: [
            './editor-toolbar.component.css',
            '../../../novel-editor.component.css'
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        encapsulation: ViewEncapsulation.None
    })
], EditorToolbarComponent);
export { EditorToolbarComponent };
