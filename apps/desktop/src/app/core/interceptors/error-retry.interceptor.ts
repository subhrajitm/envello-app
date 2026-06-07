import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timer } from 'rxjs';
import { LoggingService } from '@envello/core';
import { Router } from '@angular/router';

const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 8000;

/**
 * Handles HTTP errors: retries transient failures, logs, and redirects to server-error on 5xx.
 */
export const errorRetryInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const logging = inject(LoggingService);
  const router = inject(Router);

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, count) => {
        const isRetryable =
          error instanceof HttpErrorResponse &&
          (error.status >= 500 || error.status === 0) &&
          count <= MAX_RETRIES;
        if (!isRetryable) return throwError(() => error);
        const delayMs = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, count - 1), MAX_RETRY_DELAY_MS);
        logging.warn(`HTTP retry ${count}/${MAX_RETRIES} (${delayMs}ms)`, req.url);
        return timer(delayMs);
      },
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        logging.error(`HTTP ${error.status} ${error.url}`, error);
        if (error.status >= 500) {
          router.navigate(['/server-error'], {
            queryParams: { message: 'Server error. Please try again later.' },
            skipLocationChange: true,
          }).catch(() => {});
        }
      }
      return throwError(() => error);
    })
  );
};
