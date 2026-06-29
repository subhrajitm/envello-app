import { Component, ChangeDetectionStrategy, HostListener, input, output } from '@angular/core';

@Component({
    selector: 'env-slider-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (isOpen()) {
            <div class="esp-backdrop" (click)="closed.emit()">
                <div class="esp-panel" [style.width]="width()" (click)="$event.stopPropagation()">
                    <ng-content></ng-content>
                </div>
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
            display: flex;
            justify-content: flex-end;
            animation: esp-bd-in 0.18s ease-out;
        }
        @keyframes esp-bd-in { from { opacity: 0; } to { opacity: 1; } }

        .esp-panel {
            max-width: 95vw;
            height: 100%;
            background: var(--bg-app);
            border-left: 1px solid var(--border-subtle);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: -8px 0 40px rgba(0, 0, 0, 0.18);
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
    closed = output<void>();

    @HostListener('document:keydown.escape')
    onEscape() {
        if (this.isOpen()) this.closed.emit();
    }
}
