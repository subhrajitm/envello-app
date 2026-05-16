import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { DataService } from '@envello/data';
import { FILE_SYSTEM } from '@envello/state';
import { PouchDbDataService as DatabaseService, FileSystemService } from '@envello/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
    provideHttpClient(),
    provideAnimationsAsync(),
    { provide: DataService, useExisting: DatabaseService },
    { provide: FILE_SYSTEM, useExisting: FileSystemService }
  ],
};
