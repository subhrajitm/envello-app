import { ApplicationConfig, provideZonelessChangeDetection, ErrorHandler } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/errors/global-error.handler';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorRetryInterceptor } from './core/interceptors/error-retry.interceptor';
import { DataService } from '@envello/data';
import { FILE_SYSTEM } from '@envello/state';
import { PowerSyncDataService, FileSystemService } from '@envello/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
    provideHttpClient(withInterceptors([authInterceptor, errorRetryInterceptor])),
    provideAnimationsAsync(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: DataService, useExisting: PowerSyncDataService },
    { provide: FILE_SYSTEM, useExisting: FileSystemService }
  ],
};
