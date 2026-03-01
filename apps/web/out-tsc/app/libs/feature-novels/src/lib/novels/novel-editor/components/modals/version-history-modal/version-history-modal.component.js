import { __decorate } from "tslib";
import { Component, input, output, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionHistoryService } from '@envello/core';
let VersionHistoryModalComponent = class VersionHistoryModalComponent {
    isOpen = input.required();
    versions = input.required();
    restore = output();
    close = output();
    versionHistoryService = inject(VersionHistoryService);
};
VersionHistoryModalComponent = __decorate([
    Component({
        selector: 'app-version-history-modal',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './version-history-modal.component.html',
        styleUrls: [
            './version-history-modal.component.css',
            '../../../novel-editor.component.css'
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        encapsulation: ViewEncapsulation.None
    })
], VersionHistoryModalComponent);
export { VersionHistoryModalComponent };
