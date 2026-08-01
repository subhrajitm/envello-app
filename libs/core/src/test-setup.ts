// Web Streams polyfill — jsdom doesn't expose TransformStream/ReadableStream
// which the Vercel AI SDK requires at module load time.
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';
Object.assign(globalThis, { ReadableStream, TransformStream, WritableStream });

// crypto.randomUUID() polyfill — available in Node 18+ but not always in jsdom
if (!globalThis.crypto?.randomUUID) {
  const { webcrypto } = require('crypto');
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true
});
