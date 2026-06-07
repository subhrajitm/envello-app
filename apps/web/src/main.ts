import './polyfills';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Pre-create workers with the inline new Worker(new URL(...)) pattern so esbuild/Vite
// detect and compile them in both dev and production modes.
// Services in libs receive the pre-created instances via globalThis to avoid cross-layer imports.
if (typeof Worker !== 'undefined') {
  try {
    (globalThis as any).__MARKDOWN_WORKER__ = new Worker(
      new URL('./app/workers/markdown.worker', import.meta.url),
      { type: 'module' }
    );
  } catch (e) {
    console.warn('[main] Markdown worker unavailable:', e);
  }
  try {
    (globalThis as any).__AI_WORKER__ = new Worker(
      new URL('./app/workers/ai-inference.worker', import.meta.url),
      { type: 'module' }
    );
  } catch (e) {
    console.warn('[main] AI inference worker unavailable:', e);
  }
}

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  console.error('Bootstrap failed', err);
});
