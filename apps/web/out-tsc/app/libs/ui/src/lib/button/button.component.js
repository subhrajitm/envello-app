import { __decorate } from 'tslib';
import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
let ButtonComponent = class ButtonComponent {
  variant = 'primary';
  size = 'md';
  icon;
  iconPos = 'left';
  disabled = false;
  loading = false;
  type = 'button';
  clicked = output();
  onClick() {
    if (!this.disabled) this.clicked.emit();
  }
};
__decorate([Input()], ButtonComponent.prototype, 'variant', void 0);
__decorate([Input()], ButtonComponent.prototype, 'size', void 0);
__decorate([Input()], ButtonComponent.prototype, 'icon', void 0);
__decorate([Input()], ButtonComponent.prototype, 'iconPos', void 0);
__decorate([Input()], ButtonComponent.prototype, 'disabled', void 0);
__decorate([Input()], ButtonComponent.prototype, 'loading', void 0);
__decorate([Input()], ButtonComponent.prototype, 'type', void 0);
ButtonComponent = __decorate(
  [
    Component({
      selector: 'env-button',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './button.component.html',
      styleUrl: './button.component.css',
    }),
  ],
  ButtonComponent,
);
export { ButtonComponent };
