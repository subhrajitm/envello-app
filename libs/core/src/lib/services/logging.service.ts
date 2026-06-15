import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

@Injectable({ providedIn: 'root' })
export class LoggingService {
  private readonly minLevel = (environment.logLevel ?? 'warn') as LogLevel;
  private readonly minOrder = LEVEL_ORDER[this.minLevel];

  /** Optional correlation ID for the current request/session */
  private correlationId: string | null = null;

  setCorrelationId(id: string | null): void {
    this.correlationId = id;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= this.minOrder;
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const prefix = this.correlationId
      ? `[${level.toUpperCase()}] [${this.correlationId}]`
      : `[${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, ...args), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, ...args), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args), ...args);
    }
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args), ...args);
      if (error !== undefined) {
        console.error(error);
      }
    }
    // In production you would send to backend / Sentry here
    if (environment.production && error instanceof Error) {
      this.sendToBackend('error', message, error);
    }
  }

  private sendToBackend(level: string, message: string, error: Error): void {
    if (!environment.apiBaseUrl || typeof navigator === 'undefined') return;
    try {
      navigator.sendBeacon(
        `${environment.apiBaseUrl}/logs`,
        JSON.stringify({ level, message, stack: error.stack, timestamp: new Date().toISOString() })
      );
    } catch { /* sendBeacon not available in all environments */ }
  }
}
