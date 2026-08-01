import './polyfills';
import * as Sentry from '@sentry/angular';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    release: `envello-desktop@${environment.version}`,
    tracesSampleRate: 0,
    integrations: [],
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value ?? '';
      if (msg.includes('NavigatorLockAcquireTimeoutError')) return null;
      if (msg.includes('ResizeObserver loop'))              return null;
      return event;
    },
  });
}

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
