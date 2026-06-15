import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WebPreviewService {
  isOpen = signal(false);
  url = signal('');
  title = signal('');

  open(url: string, title = ''): void {
    if (!/^https?:\/\//i.test(url)) return;
    this.url.set(url);
    this.title.set(title || this.extractDomain(url));
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
}
