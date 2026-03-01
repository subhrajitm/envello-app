import { __decorate } from "tslib";
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
let BadgeComponent = class BadgeComponent {
    variant = 'default';
    pill = false;
};
__decorate([
    Input()
], BadgeComponent.prototype, "variant", void 0);
__decorate([
    Input()
], BadgeComponent.prototype, "pill", void 0);
BadgeComponent = __decorate([
    Component({
        selector: 'env-badge',
        standalone: true,
        imports: [CommonModule],
        templateUrl: './badge.component.html',
        styleUrl: './badge.component.css',
    })
], BadgeComponent);
export { BadgeComponent };
