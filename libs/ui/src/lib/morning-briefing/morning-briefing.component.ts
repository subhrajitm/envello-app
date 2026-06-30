import { Component, output, signal, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MorningBriefingService, BriefingData } from '@envello/core';

@Component({
  selector: 'env-morning-briefing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './morning-briefing.component.html',
  styleUrl: './morning-briefing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MorningBriefingComponent implements OnDestroy {
  private briefingService = inject(MorningBriefingService);
  private cdr             = inject(ChangeDetectorRef);

  closed = output<void>();

  data         = signal<BriefingData | null>(null);
  narrative    = signal('');
  isGenerating = signal(false);
  isVisible    = signal(false);

  private aborted = false;

  async open() {
    this.aborted   = false;
    const snapshot = this.briefingService.collectData();
    this.data.set(snapshot);
    this.narrative.set('');
    this.isVisible.set(true);
    this.isGenerating.set(true);

    try {
      for await (const chunk of this.briefingService.generateNarrative(snapshot)) {
        if (this.aborted) break;
        this.narrative.update(n => n + chunk);
        this.cdr.markForCheck();
      }
    } finally {
      this.isGenerating.set(false);
      this.cdr.markForCheck();
    }
  }

  dismiss() {
    this.aborted = true;
    this.briefingService.markShown();
    this.isVisible.set(false);
    this.closed.emit();
  }

  ngOnDestroy() {
    this.aborted = true;
  }

  priorityColor(priority: string): string {
    if (priority === 'HIGH')   return 'var(--accent-red, #f87171)';
    if (priority === 'MEDIUM') return 'var(--accent-yellow, #fbbf24)';
    return 'var(--text-tertiary)';
  }

  meetingIcon(type: string): string {
    const icons: Record<string, string> = {
      video: 'videocam', phone: 'call', 'in-person': 'people', hybrid: 'devices',
    };
    return icons[type] ?? 'event';
  }
}
