import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DeleteModalData {
  isOpen: boolean;
  type: 'chapter' | 'group' | 'character' | 'location' | 'note' | null;
  id: string | null;
  title: string;
  message: string;
}

@Component({
  selector: 'app-delete-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-modal.component.html',
  styleUrls: [
    './delete-modal.component.css',
    '../../../novel-editor.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class DeleteModalComponent {
  modal = input.required<DeleteModalData>();
  confirm = output<void>();
  cancel = output<void>();
}
