import { Component, Input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'env-confirm-dialog',
    standalone: true,
    imports: [],
    templateUrl: './confirm-dialog.component.html',
    styleUrl: './confirm-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
    @Input() isOpen = false;
    @Input() title = 'Are you sure?';
    @Input() icon = '';
    @Input() variant: 'danger' | 'success' = 'danger';
    @Input() confirmLabel = 'Confirm';
    @Input() cancelLabel = 'Cancel';

    confirmed = output<void>();
    cancelled = output<void>();
}
