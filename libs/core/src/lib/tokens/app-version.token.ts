import { InjectionToken } from '@angular/core';

export const APP_VERSION = new InjectionToken<string>('APP_VERSION', {
  providedIn: 'root',
  factory: () => '0.0.0',
});
