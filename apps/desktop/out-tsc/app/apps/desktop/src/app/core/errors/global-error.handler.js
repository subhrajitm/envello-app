import { __decorate } from 'tslib';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoggingService } from '@envello/core';
import { environment } from '../../../environments/environment';
let GlobalErrorHandler = class GlobalErrorHandler {
  logging = inject(LoggingService);
  router = inject(Router);
  handleError(error) {
    const message = error instanceof Error ? error.message : String(error);
    // Suppress benign Supabase lock timeout errors during dev/HMR
    if (
      message.includes('NavigatorLockAcquireTimeoutError') ||
      String(error).includes('NavigatorLockAcquireTimeoutError')
    ) {
      return;
    }
    const stack = error instanceof Error ? error.stack : undefined;
    this.logging.error('Unhandled error', error);
    if (environment.production) {
      // Do not expose stack or internal details in production
      this.router
        .navigate(['/server-error'], {
          queryParams: { message: 'Something went wrong. Please try again.' },
          skipLocationChange: true,
        })
        .catch(() => {});
    } else if (stack) {
      console.error('Stack trace:', stack);
    }
  }
};
GlobalErrorHandler = __decorate([Injectable()], GlobalErrorHandler);
export { GlobalErrorHandler };
