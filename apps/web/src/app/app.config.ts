import { ApplicationConfig, provideZoneChangeDetection, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/errors/global-error.handler';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorRetryInterceptor } from './core/interceptors/error-retry.interceptor';
import { PersistenceAdapter, TaskPersistenceEffect, NotePersistenceEffect, NovelPersistenceEffect } from '@envello/shared-data';
import { RxdbPersistenceAdapter } from './data/adapters/rxdb-persistence.adapter';
import { TaskReducer, NoteReducer, NovelReducer } from '@envello/shared-state';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorRetryInterceptor])),
    provideAnimations(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },

    // Event-driven architecture providers
    { provide: PersistenceAdapter, useClass: RxdbPersistenceAdapter },
    TaskReducer,
    TaskPersistenceEffect,
    NoteReducer,
    NotePersistenceEffect,
    NovelReducer,
    NovelPersistenceEffect,
  ],
};
