import { Component, input, output, signal, HostListener, HostBinding, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { NgClass } from '@angular/common';
import { IconButtonComponent } from '../icon-button/icon-button.component';

@Component({
  selector: 'lib-editor-card',
  standalone: true,
  imports: [NgClass, IconButtonComponent],
  templateUrl: './editor-card.component.html',
  styleUrl: './editor-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class EditorCardComponent {
  @HostBinding('style.display') readonly hostDisplay = 'contents';

  showColorPicker = signal(false);

  isFullWidth = input<boolean>(false);
  cardBgColor = input<string>('');
  bgColors = input<string[]>([]);

  fullWidthChange = output<boolean>();
  bgColorChange = output<string>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.lec-color-picker-wrapper')) {
      this.showColorPicker.set(false);
    }
  }

  toggleColorPicker() {
    this.showColorPicker.update(v => !v);
  }

  selectColor(color: string) {
    this.bgColorChange.emit(color);
    this.showColorPicker.set(false);
  }

  colorTitle(color: string): string {
    if (!color) return 'Default';
    return color.replace(/^(?:ms-bg--|note-bg--)/, '');
  }
}
