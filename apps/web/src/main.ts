import './polyfills';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Register worker URLs so services in libs can create them without depending on app files.
if (typeof Worker !== 'undefined') {
  (globalThis as any).__MARKDOWN_WORKER_URL__ = new URL(
    './app/workers/markdown.worker',
    import.meta.url
  );
  (globalThis as any).__AI_WORKER_URL__ = new URL(
    './app/workers/ai-inference.worker',
    import.meta.url
  );
}

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  console.error('Bootstrap failed', err);
});
