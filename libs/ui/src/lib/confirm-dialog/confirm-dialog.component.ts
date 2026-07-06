import { Component, Input, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
    selector: 'env-confirm-dialog',
    standalone: true,
    imports: [A11yModule],
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

    @HostListener('keydown.escape')
    onEscape() {
        if (this.isOpen) this.cancelled.emit();
    }
}
