import { __decorate } from "tslib";
import { Component, input, output, ViewChild, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
let AddModalComponent = class AddModalComponent {
    modal = input.required();
    inputValueChange = output();
    inputValue2Change = output();
    confirm = output();
    cancel = output();
    addInputRef;
    shouldFocusInput = false;
    ngAfterViewChecked() {
        if (this.shouldFocusInput && this.addInputRef?.nativeElement) {
            this.addInputRef.nativeElement.focus();
            this.addInputRef.nativeElement.select();
            this.shouldFocusInput = false;
        }
    }
    onInputChange(value) {
        this.inputValueChange.emit(value);
    }
    onInput2Change(value) {
        this.inputValue2Change.emit(value);
    }
    onConfirm() {
        if (this.modal().inputValue.trim()) {
            this.confirm.emit();
        }
    }
    onCancel() {
        this.cancel.emit();
    }
    onKeydown(event) {
        if (event.key === 'Enter' && this.modal().type !== 'note') {
            event.preventDefault();
            this.onConfirm();
        }
        else if (event.key === 'Escape') {
            this.onCancel();
        }
    }
};
__decorate([
    ViewChild('addInput')
], AddModalComponent.prototype, "addInputRef", void 0);
AddModalComponent = __decorate([
    Component({
        selector: 'app-add-modal',
        standalone: true,
        imports: [CommonModule, FormsModule],
        templateUrl: './add-modal.component.html',
        styleUrls: [
            './add-modal.component.css',
            '../../../novel-editor.component.css'
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        encapsulation: ViewEncapsulation.None
    })
], AddModalComponent);
export { AddModalComponent };
