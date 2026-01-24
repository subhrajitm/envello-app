import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
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
  styleUrl: './delete-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteModalComponent {
  modal = input.required<DeleteModalData>();
  confirm = output<void>();
  cancel = output<void>();
}
