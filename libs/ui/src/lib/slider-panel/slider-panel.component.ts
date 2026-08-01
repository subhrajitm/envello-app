import { Component, ChangeDetectionStrategy, HostListener, input, output } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
    selector: 'env-slider-panel',
    standalone: true,
    imports: [A11yModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (isOpen()) {
            <div
              class="esp-backdrop"
              (click)="closed.emit()"
              aria-hidden="true">
            </div>
            <div
              class="esp-panel"
              [style.width]="width()"
              role="dialog"
              aria-modal="true"
              [attr.aria-label]="label()"
              cdkTrapFocus
              cdkTrapFocusAutoCapture>
              <ng-content></ng-content>
            </div>
        }
    `,
    styles: [`
        :host { display: contents; }

        .esp-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: var(--z-modal-backdrop);
            animation: esp-bd-in 0.18s ease-out;
        }
        @keyframes esp-bd-in { from { opacity: 0; } to { opacity: 1; } }

        .esp-panel {
            position: fixed;
            top: 0; right: 0; bottom: 0;
            max-width: 95vw;
            background: var(--bg-app);
            border-left: 1px solid var(--border-subtle);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: -8px 0 40px rgba(0, 0, 0, 0.18);
            z-index: var(--z-modal);
            animation: esp-panel-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes esp-panel-in {
            from { transform: translateX(100%); opacity: 0.6; }
            to   { transform: translateX(0);    opacity: 1; }
        }
    `],
})
export class SliderPanelComponent {
    isOpen = input<boolean>(false);
    width  = input<string>('620px');
    /** Accessible name announced by screen readers when the panel opens. */
    label  = input<string>('Panel');
    closed = output<void>();

    @HostListener('document:keydown.escape')
    onEscape() {
        if (this.isOpen()) this.closed.emit();
    }
}
