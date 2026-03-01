import { __decorate } from "tslib";
import { Component, input, output, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NovelContentService } from '@envello/core';
let StructureViewComponent = class StructureViewComponent {
    novelService = inject(NovelContentService);
    frontMatter = input.required();
    prologue = input(null);
    activeFrontMatterId = input.required();
    activePrologueId = input.required();
    addMenuOpen = input.required();
    selectFrontMatterItem = output();
    selectPrologue = output();
    deleteFrontMatterItem = output();
    deletePrologue = output();
    addFrontMatterItem = output();
    addPrologue = output();
    toggleAddMenu = output();
    getFrontMatterTypeIcon(type) {
        const icons = {
            'title-page': 'title',
            'copyright': 'copyright',
            'toc': 'list',
            'dedication': 'favorite',
            'foreword': 'menu_book',
            'preface': 'description'
        };
        return icons[type] || 'description';
    }
};
StructureViewComponent = __decorate([
    Component({
        selector: 'app-structure-view',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './structure-view.component.html',
        styleUrls: [
            './structure-view.component.css',
            '../../../novel-editor.component.css'
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        encapsulation: ViewEncapsulation.None
    })
], StructureViewComponent);
export { StructureViewComponent };
