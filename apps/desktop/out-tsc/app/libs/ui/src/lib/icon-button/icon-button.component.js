import { __decorate } from 'tslib';
import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
let IconButtonComponent = class IconButtonComponent {
  icon = 'add';
  variant = 'ghost';
  size = 32;
  disabled = false;
  type = 'button';
  active = false;
  title = '';
  clicked = output();
  onClick() {
    if (!this.disabled) this.clicked.emit();
  }
};
__decorate([Input()], IconButtonComponent.prototype, 'icon', void 0);
__decorate([Input()], IconButtonComponent.prototype, 'variant', void 0);
__decorate([Input()], IconButtonComponent.prototype, 'size', void 0);
__decorate([Input()], IconButtonComponent.prototype, 'disabled', void 0);
__decorate([Input()], IconButtonComponent.prototype, 'type', void 0);
__decorate([Input()], IconButtonComponent.prototype, 'active', void 0);
__decorate([Input()], IconButtonComponent.prototype, 'title', void 0);
IconButtonComponent = __decorate(
  [
    Component({
      selector: 'env-icon-button',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './icon-button.component.html',
      styleUrl: './icon-button.component.css',
    }),
  ],
  IconButtonComponent,
);
export { IconButtonComponent };
