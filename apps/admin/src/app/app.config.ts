import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { SUPABASE_STORAGE_KEY, SUPABASE_SILENT_LOCK } from '@envello/core';

// Suppress Supabase background-lock noise from the console.
// The lock errors (isAcquireTimeout=true) are expected, non-fatal, and fully
// handled by supabase-js internals — no need to surface them to developers.
class AdminErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if ((error as any)?.isAcquireTimeout) return;
    console.error(error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    { provide: SUPABASE_STORAGE_KEY, useValue: 'sb-admin-auth-token' },
    { provide: SUPABASE_SILENT_LOCK, useValue: true },
    { provide: ErrorHandler, useClass: AdminErrorHandler },
  ]
};
