import { __decorate } from "tslib";
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
let EmptyStateComponent = class EmptyStateComponent {
    icon = 'inbox';
    title = '';
    description = '';
    compact = false;
};
__decorate([
    Input()
], EmptyStateComponent.prototype, "icon", void 0);
__decorate([
    Input()
], EmptyStateComponent.prototype, "title", void 0);
__decorate([
    Input()
], EmptyStateComponent.prototype, "description", void 0);
__decorate([
    Input()
], EmptyStateComponent.prototype, "compact", void 0);
EmptyStateComponent = __decorate([
    Component({
        selector: 'env-empty-state',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './empty-state.component.html',
        styleUrl: './empty-state.component.css',
    })
], EmptyStateComponent);
export { EmptyStateComponent };
