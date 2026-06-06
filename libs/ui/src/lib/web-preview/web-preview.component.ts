import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
  viewChild,
  HostListener,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WebPreviewService, TauriService } from '@envello/core';

type LoadState = 'loading' | 'loaded' | 'blocked';

@Component({
  selector: 'env-web-preview',
  templateUrl: './web-preview.component.html',
  styleUrl: './web-preview.component.css',
  standalone: true,
})
export class WebPreviewComponent {
  protected preview = inject(WebPreviewService);
  protected tauri = inject(TauriService);
  private sanitizer = inject(DomSanitizer);

  protected loadState = signal<LoadState>('loading');
  protected safeUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.preview.url())
  );

  protected displayUrl = computed(() => {
    try {
      const u = new URL(this.preview.url());
      return u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      return this.preview.url();
    }
  });

  protected faviconUrl = computed(() => {
    try {
      const u = new URL(this.preview.url());
      return `${u.protocol}//${u.hostname}/favicon.ico`;
    } catch {
      return '';
    }
  });

  iframeRef = viewChild<ElementRef<HTMLIFrameElement>>('iframe');

  constructor() {
    // Reset spinner each time a new URL is opened
    effect(() => {
      if (this.preview.isOpen()) {
        this.preview.url(); // track url changes too
        this.loadState.set('loading');
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.preview.isOpen()) {
      this.preview.close();
    }
  }

  protected onIframeLoad() {
    const iframe = this.iframeRef()?.nativeElement;
    if (!iframe) {
      this.loadState.set('loaded');
      return;
    }
    try {
      const href = iframe.contentWindow?.location.href;
      this.loadState.set(href === 'about:blank' ? 'blocked' : 'loaded');
    } catch {
      // cross-origin access throws → page actually loaded
      this.loadState.set('loaded');
    }
  }

  protected reload() {
    const iframe = this.iframeRef()?.nativeElement;
    if (iframe) {
      this.loadState.set('loading');
      iframe.src = iframe.src;
    }
  }

  protected async openExternal() {
    await this.tauri.openUrl(this.preview.url());
  }

  protected async openInWindow() {
    await this.tauri.openInWebview(this.preview.url(), this.preview.title());
    this.preview.close();
  }
}
