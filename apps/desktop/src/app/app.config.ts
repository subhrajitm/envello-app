import { ApplicationConfig, provideZonelessChangeDetection, ErrorHandler } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/errors/global-error.handler';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorRetryInterceptor } from './core/interceptors/error-retry.interceptor';
import { DataService } from '@envello/data';
import { FILE_SYSTEM } from '@envello/state';
import { DesktopDataService, FileSystemService, APP_VERSION } from '@envello/core';
import { environment } from '../environments/environment';

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
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: DataService, useClass: DesktopDataService },
    { provide: FILE_SYSTEM, useClass: FileSystemService },
    { provide: APP_VERSION, useValue: environment.version }
  ],
};
