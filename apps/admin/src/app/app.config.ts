import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { SUPABASE_STORAGE_KEY, SUPABASE_SILENT_LOCK } from '@envello/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    { provide: SUPABASE_STORAGE_KEY, useValue: 'sb-admin-auth-token' },
    { provide: SUPABASE_SILENT_LOCK, useValue: true },
  ]
};
