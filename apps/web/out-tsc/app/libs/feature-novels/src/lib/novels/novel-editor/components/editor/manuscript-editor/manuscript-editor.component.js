import { __decorate } from "tslib";
import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiptapEditorDirective } from 'ngx-tiptap';
let ManuscriptEditorComponent = class ManuscriptEditorComponent {
    editor = input.required();
    activeChapterId = input.required();
    title = input.required();
    chapterStatus = input.required();
    chapterLastEdited = input.required();
    isSaving = input.required();
    lastSaved = input(null);
    titleChange = output();
    addNewChapter = output();
};
ManuscriptEditorComponent = __decorate([
    Component({
        selector: 'app-manuscript-editor',
        standalone: true,
        imports: [CommonModule, FormsModule, TiptapEditorDirective],
        templateUrl: './manuscript-editor.component.html',
        styleUrls: [
            './manuscript-editor.component.css',
            '../../../novel-editor.component.css'
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        encapsulation: ViewEncapsulation.None
    })
], ManuscriptEditorComponent);
export { ManuscriptEditorComponent };
