/**
 * Polyfills for RxDB and other dependencies that assume Node.js globals.
 * Required when using RxDB with Angular / webpack-based builds.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).process = { env: { DEBUG: undefined } };
}
