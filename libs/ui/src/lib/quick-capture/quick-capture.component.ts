import {
  Component, inject, signal, computed, HostListener,
  ViewChild, ElementRef, AfterViewChecked, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CaptureService, CaptureIntent, CAPTURE_TYPE_META } from '@envello/core';

@Component({
  selector: 'env-quick-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-capture.component.html',
  styleUrl: './quick-capture.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickCaptureComponent implements AfterViewChecked {
  @ViewChild('captureInput') inputEl!: ElementRef<HTMLInputElement>;

  readonly captureService = inject(CaptureService);
  private router = inject(Router);

  inputText   = signal('');
  intent      = signal<CaptureIntent | null>(null);
  classifying = signal(false);
  submitting  = signal(false);
  success     = signal(false);

  private classifyTimer: ReturnType<typeof setTimeout> | null = null;
  private needsFocus = false;

  readonly typeMeta = computed(() => {
    const t = this.intent()?.type;
    return t ? CAPTURE_TYPE_META[t] : null;
  });

  readonly fieldHints = computed(() => {
    const f = this.intent()?.fields;
    if (!f) return [];
    const hints: string[] = [];
    if (f.due)                          hints.push(`Due ${f.due}`);
    if (f.priority && f.priority !== 'MEDIUM') hints.push(f.priority);
    if (f.attendees?.length)            hints.push(`With: ${f.attendees.join(', ')}`);
    if (f.amount)                       hints.push(`Amount: ${f.amount}`);
    if (f.date)                         hints.push(`Date: ${f.date}`);
    return hints;
  });

  ngAfterViewChecked() {
    if (this.needsFocus && this.captureService.isOverlayOpen()) {
      this.inputEl?.nativeElement?.focus();
      this.needsFocus = false;
    }
  }

  open() {
    this.reset();
    this.captureService.open();
    this.needsFocus = true;
  }

  close() {
    this.captureService.close();
    this.reset();
  }

  private reset() {
    if (this.classifyTimer) clearTimeout(this.classifyTimer);
    this.inputText.set('');
    this.intent.set(null);
    this.classifying.set(false);
    this.submitting.set(false);
    this.success.set(false);
  }

  onInput(event: Event) {
    const text = (event.target as HTMLInputElement).value;
    this.inputText.set(text);

    if (this.classifyTimer) clearTimeout(this.classifyTimer);
    if (text.trim().length < 3) { this.intent.set(null); return; }

    this.classifying.set(true);
    this.classifyTimer = setTimeout(async () => {
      const result = await this.captureService.classify(text.trim());
      this.intent.set(result);
      this.classifying.set(false);
    }, 550);
  }

  async submit() {
    const text = this.inputText().trim();
    if (!text || this.submitting()) return;

    this.submitting.set(true);
    if (this.classifyTimer) clearTimeout(this.classifyTimer);

    try {
      const intent = this.intent() ?? await this.captureService.classify(text);
      const result = await this.captureService.dispatch(intent);

      this.success.set(true);
      setTimeout(() => {
        this.close();
        this.router.navigate([result.route]);
      }, 700);
    } catch {
      this.submitting.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    // Open shortcut: Ctrl/Cmd + Shift + K
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      if (this.captureService.isOverlayOpen()) { this.close(); } else { this.open(); }
      return;
    }

    if (!this.captureService.isOverlayOpen()) return;

    if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.submit(); }
  }

  trackByHint(_: number, h: string) { return h; }
}
