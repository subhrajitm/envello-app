import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoggingService } from './logging.service';

/**
 * Central API layer for all HTTP calls.
 * When backend exists, replace stub methods with real HttpClient calls.
 * Keep DTOs and mapping here, not in UI components.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly logging = inject(LoggingService);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Observable<T> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as Record<string, string> })
      : undefined;
    this.logging.debug('API GET', `${this.baseUrl}${path}`);
    // Stub: no backend yet; return empty. Uncomment when backend is ready:
    // return this.http.get<T>(`${this.baseUrl}${path}`, { params: httpParams });
    return of(null as T);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    this.logging.debug('API POST', `${this.baseUrl}${path}`);
    // return this.http.post<T>(`${this.baseUrl}${path}`, body);
    return of(null as T);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    this.logging.debug('API PUT', `${this.baseUrl}${path}`);
    // return this.http.put<T>(`${this.baseUrl}${path}`, body);
    return of(null as T);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    this.logging.debug('API PATCH', `${this.baseUrl}${path}`);
    // return this.http.patch<T>(`${this.baseUrl}${path}`, body);
    return of(null as T);
  }

  delete<T>(path: string): Observable<T> {
    this.logging.debug('API DELETE', `${this.baseUrl}${path}`);
    // return this.http.delete<T>(`${this.baseUrl}${path}`);
    return of(null as T);
  }
}
