import { __decorate } from 'tslib';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
const LEVEL_ORDER = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
let LoggingService = class LoggingService {
  minLevel = environment.logLevel ?? 'warn';
  minOrder = LEVEL_ORDER[this.minLevel];
  /** Optional correlation ID for the current request/session */
  correlationId = null;
  setCorrelationId(id) {
    this.correlationId = id;
  }
  shouldLog(level) {
    return LEVEL_ORDER[level] >= this.minOrder;
  }
  formatMessage(level, message, ...args) {
    const prefix = this.correlationId
      ? `[${level.toUpperCase()}] [${this.correlationId}]`
      : `[${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }
  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, ...args), ...args);
    }
  }
  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, ...args), ...args);
    }
  }
  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args), ...args);
    }
  }
  error(message, error, ...args) {
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
  /** Stub: send error to backend log collector (implement when backend exists) */
  sendToBackend(level, message, error) {
    if (!environment.apiBaseUrl) return;
    // Example: navigator.sendBeacon(`${environment.apiBaseUrl}/logs`, JSON.stringify({ level, message, stack: error.stack }));
  }
};
LoggingService = __decorate(
  [Injectable({ providedIn: 'root' })],
  LoggingService,
);
export { LoggingService };
