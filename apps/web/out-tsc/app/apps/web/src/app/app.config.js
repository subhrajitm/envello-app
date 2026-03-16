import { provideZoneChangeDetection, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/errors/global-error.handler';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorRetryInterceptor } from './core/interceptors/error-retry.interceptor';
import { DataService } from '@envello/data';
import { FILE_SYSTEM } from '@envello/state';
import { PouchDbDataService as DatabaseService } from '@envello/core';
import { FileSystemService } from '@envello/core';
export const appConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorRetryInterceptor]),
    ),
    provideAnimations(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: DataService, useExisting: DatabaseService },
    { provide: FILE_SYSTEM, useExisting: FileSystemService },
  ],
};
