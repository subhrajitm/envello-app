import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
  viewChild,
  HostListener,
  DestroyRef,
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
  private destroyRef = inject(DestroyRef);

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
  contentAreaRef = viewChild<ElementRef<HTMLDivElement>>('contentArea');

  constructor() {
    effect(() => {
      if (this.preview.isOpen()) {
        const url = this.preview.url();
        this.loadState.set('loading');
        if (this.tauri.isTauri()) {
          // 150ms: lets the slide-in animation settle and layout to flush
          setTimeout(() => this.mountEmbeddedWebview(url), 150);
        }
      } else {
        this.tauri.destroyEmbeddedWebview();
      }
    });

    this.destroyRef.onDestroy(() => this.tauri.destroyEmbeddedWebview());
  }

  private async mountEmbeddedWebview(url: string) {
    const el = this.contentAreaRef()?.nativeElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    await this.tauri.createEmbeddedWebview(url, {
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
    });
    this.loadState.set('loaded');
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.preview.isOpen()) this.close();
  }

  @HostListener('window:resize')
  async onResize() {
    const el = this.contentAreaRef()?.nativeElement;
    if (!el || !this.preview.isOpen() || !this.tauri.isTauri()) return;
    const r = el.getBoundingClientRect();
    await this.tauri.updateEmbeddedWebviewBounds({
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
    });
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
    if (this.tauri.isTauri()) {
      this.mountEmbeddedWebview(this.preview.url());
      return;
    }
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
    this.close();
  }

  protected close() {
    this.tauri.destroyEmbeddedWebview();
    this.preview.close();
  }
}
