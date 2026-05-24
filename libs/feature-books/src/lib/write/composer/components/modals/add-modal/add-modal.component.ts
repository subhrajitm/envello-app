import { Component, input, output, ViewChild, ElementRef, AfterViewChecked, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AddModalData {
  isOpen: boolean;
  type: 'act' | 'chapter' | 'note' | null;
  title: string;
  inputValue: string;
  inputValue2?: string;
}

@Component({
  selector: 'app-add-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-modal.component.html',
  styleUrls: [
    './add-modal.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AddModalComponent implements AfterViewChecked {
  modal = input.required<AddModalData>();
  inputValueChange = output<string>();
  inputValue2Change = output<string>();
  confirm = output<void>();
  cancel = output<void>();
  
  @ViewChild('addInput') addInputRef!: ElementRef<HTMLInputElement>;
  private shouldFocusInput = false;

  ngAfterViewChecked() {
    if (this.shouldFocusInput && this.addInputRef?.nativeElement) {
      this.addInputRef.nativeElement.focus();
      this.addInputRef.nativeElement.select();
      this.shouldFocusInput = false;
    }
  }

  onInputChange(value: string) {
    this.inputValueChange.emit(value);
  }

  onInput2Change(value: string) {
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

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && this.modal().type !== 'note') {
      event.preventDefault();
      this.onConfirm();
    } else if (event.key === 'Escape') {
      this.onCancel();
    }
  }
}
