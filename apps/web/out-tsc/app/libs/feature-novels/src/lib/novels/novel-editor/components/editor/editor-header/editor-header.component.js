import { __decorate } from "tslib";
import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
let EditorHeaderComponent = class EditorHeaderComponent {
    activeNav = input.required();
    canUndo = input.required();
    canRedo = input.required();
    searchOpen = input.required();
    searchQuery = input.required();
    filteredResults = input(null);
    focusMode = input.required();
    fullScreenMode = input.required();
    exportMenuOpen = input.required();
    setActiveNav = output();
    performUndo = output();
    performRedo = output();
    toggleSearch = output();
    searchQueryChange = output();
    selectSearchResult = output();
    toggleFocusMode = output();
    toggleFullScreen = output();
    openVersionHistory = output();
    toggleExportMenu = output();
    exportNovel = output();
};
EditorHeaderComponent = __decorate([
    Component({
        selector: 'app-editor-header',
        standalone: true,
        imports: [CommonModule, FormsModule],
        templateUrl: './editor-header.component.html',
        styleUrls: [
            './editor-header.component.css',
            '../../../novel-editor.component.css'
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        encapsulation: ViewEncapsulation.None
    })
], EditorHeaderComponent);
export { EditorHeaderComponent };
