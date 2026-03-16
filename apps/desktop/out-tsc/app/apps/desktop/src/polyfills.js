'use strict';
/**
 * Polyfills for dependencies that assume Node.js globals.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof window !== 'undefined') {
  window.global = window;
  window.process = { env: { DEBUG: undefined } };
}
