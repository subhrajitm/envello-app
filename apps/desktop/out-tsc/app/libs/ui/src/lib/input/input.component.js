import { __decorate } from 'tslib';
import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
let InputComponent = class InputComponent {
  label = '';
  placeholder = '';
  type = 'text';
  disabled = false;
  value = '';
  onChange = () => {};
  onTouched = () => {};
  writeValue(v) {
    this.value = v ?? '';
  }
  registerOnChange(fn) {
    this.onChange = fn;
  }
  registerOnTouched(fn) {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled) {
    this.disabled = isDisabled;
  }
  onInput(e) {
    const v = e.target.value;
    this.value = v;
    this.onChange(v);
  }
};
__decorate([Input()], InputComponent.prototype, 'label', void 0);
__decorate([Input()], InputComponent.prototype, 'placeholder', void 0);
__decorate([Input()], InputComponent.prototype, 'type', void 0);
__decorate([Input()], InputComponent.prototype, 'disabled', void 0);
InputComponent = __decorate(
  [
    Component({
      selector: 'env-input',
      standalone: true,
      imports: [CommonModule, FormsModule],
      templateUrl: './input.component.html',
      styleUrl: './input.component.css',
      providers: [
        {
          provide: NG_VALUE_ACCESSOR,
          useExisting: forwardRef(() => InputComponent),
          multi: true,
        },
      ],
    }),
  ],
  InputComponent,
);
export { InputComponent };
