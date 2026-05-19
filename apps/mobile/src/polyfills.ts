/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).process = { env: { DEBUG: undefined } };
}
