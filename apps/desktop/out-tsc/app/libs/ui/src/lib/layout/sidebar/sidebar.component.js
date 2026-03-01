import { __decorate } from "tslib";
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
let SidebarComponent = class SidebarComponent {
    /** Uppercase title, shown in the header */
    title = '';
    /** Small caption on the right, e.g. "4 tasks" */
    subtitle = '';
    /** Placeholder for the search input */
    searchPlaceholder = 'Search...';
    /** Current search text */
    searchQuery = '';
    /** Emit when search text changes */
    searchChange = new EventEmitter();
    /** Primary nav items (Inbox, Today, etc.) */
    items = [];
    /** Id of the currently selected item */
    activeId = null;
    /** Emit when the active nav item changes */
    activeIdChange = new EventEmitter();
    /** Optional primary add button icon (e.g. "add") */
    addIcon = null;
    /** Tooltip for the add button */
    addTooltip = 'Add';
    /** Fired when the add button is clicked */
    addClicked = new EventEmitter();
    /** Optional projected footer area */
    showFooter = false;
    onSearchInput(value) {
        this.searchChange.emit(value);
    }
    onSelectItem(id) {
        this.activeIdChange.emit(id);
    }
    onAddClick() {
        this.addClicked.emit();
    }
};
__decorate([
    Input()
], SidebarComponent.prototype, "title", void 0);
__decorate([
    Input()
], SidebarComponent.prototype, "subtitle", void 0);
__decorate([
    Input()
], SidebarComponent.prototype, "searchPlaceholder", void 0);
__decorate([
    Input()
], SidebarComponent.prototype, "searchQuery", void 0);
__decorate([
    Output()
], SidebarComponent.prototype, "searchChange", void 0);
__decorate([
    Input()
], SidebarComponent.prototype, "items", void 0);
__decorate([
    Input()
], SidebarComponent.prototype, "activeId", void 0);
__decorate([
    Output()
], SidebarComponent.prototype, "activeIdChange", void 0);
__decorate([
    Input()
], SidebarComponent.prototype, "addIcon", void 0);
__decorate([
    Input()
], SidebarComponent.prototype, "addTooltip", void 0);
__decorate([
    Output()
], SidebarComponent.prototype, "addClicked", void 0);
__decorate([
    Input()
], SidebarComponent.prototype, "showFooter", void 0);
SidebarComponent = __decorate([
    Component({
        selector: 'env-left-sidebar',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './sidebar.component.html',
        styleUrl: './sidebar.component.css'
    })
], SidebarComponent);
export { SidebarComponent };
