import './polyfills';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

if (typeof Worker !== 'undefined') {
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
