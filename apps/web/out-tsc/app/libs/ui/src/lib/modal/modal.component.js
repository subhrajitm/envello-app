import { __decorate } from "tslib";
import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconButtonComponent } from '../icon-button/icon-button.component';
let ModalComponent = class ModalComponent {
    isOpen = false;
    title = '';
    size = 'md';
    showClose = true;
    closed = output();
    onOverlayClick() {
        this.closed.emit();
    }
    onContainerClick(e) {
        e.stopPropagation();
    }
    onClose() {
        this.closed.emit();
    }
};
__decorate([
    Input()
], ModalComponent.prototype, "isOpen", void 0);
__decorate([
    Input()
], ModalComponent.prototype, "title", void 0);
__decorate([
    Input()
], ModalComponent.prototype, "size", void 0);
__decorate([
    Input()
], ModalComponent.prototype, "showClose", void 0);
ModalComponent = __decorate([
    Component({
        selector: 'env-modal',
        standalone: true,
        imports: [CommonModule, IconButtonComponent],
        templateUrl: './modal.component.html',
        styleUrl: './modal.component.css',
    })
], ModalComponent);
export { ModalComponent };
