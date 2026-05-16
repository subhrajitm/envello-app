import './polyfills';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Register the markdown worker URL so StoreService (in libs/state) can create it
// without a direct import dependency on an app-level file.
if (typeof Worker !== 'undefined') {
  (globalThis as any).__MARKDOWN_WORKER_URL__ = new URL(
    './app/workers/markdown.worker',
    import.meta.url
  );
}

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  console.error('Bootstrap failed', err);
});
