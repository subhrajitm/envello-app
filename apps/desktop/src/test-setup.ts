import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Polyfill Web Streams API for LangChain (not available in Jest's Node env by default)
const { ReadableStream, WritableStream, TransformStream, ReadableStreamBYOBReader } =
  require('node:stream/web');
Object.assign(globalThis, {
  ReadableStream,
  WritableStream,
  TransformStream,
  ReadableStreamBYOBReader,
});

setupZoneTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true
});
