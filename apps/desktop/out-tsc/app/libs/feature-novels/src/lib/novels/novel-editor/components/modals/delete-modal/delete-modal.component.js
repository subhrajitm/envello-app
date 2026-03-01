import { __decorate } from "tslib";
import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
let DeleteModalComponent = class DeleteModalComponent {
    modal = input.required();
    confirm = output();
    cancel = output();
};
DeleteModalComponent = __decorate([
    Component({
        selector: 'app-delete-modal',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './delete-modal.component.html',
        styleUrls: [
            './delete-modal.component.css',
            '../../../novel-editor.component.css'
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        encapsulation: ViewEncapsulation.None
    })
], DeleteModalComponent);
export { DeleteModalComponent };
