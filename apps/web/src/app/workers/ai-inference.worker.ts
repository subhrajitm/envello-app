/// <reference lib="webworker" />

/**
 * Web Worker for running local LLM inference via Transformers.js (ONNX).
 * Keeps model loading and inference off the main thread.
 *
 * Messages in:
 *   { type: 'init', model: string }
 *   { type: 'generate', id: string, messages: {role:string, content:string}[], maxTokens?: number }
 *   { type: 'abort', id: string }
 *
 * Messages out:
 *   { type: 'progress', file: string, loaded: number, total: number }
 *   { type: 'ready' }
 *   { type: 'chunk', id: string, text: string }
 *   { type: 'done', id: string }
 *   { type: 'error', id: string | null, message: string }
 */

import { pipeline, TextStreamer, env } from '@huggingface/transformers';

// Use CDN remote models (cached in browser's OPFS after first download)
env.allowLocalModels = false;
env.useBrowserCache = true;

type TextGenPipeline = Awaited<ReturnType<typeof pipeline<'text-generation'>>>;

let currentPipe: TextGenPipeline | null = null;
let currentModel = '';
let abortedIds = new Set<string>();

class ProgressCallback {
  constructor(private readonly postFn: typeof postMessage) {}
  __call__(ev: { status: string; file?: string; loaded?: number; total?: number }) {
    if (ev.status === 'progress' && ev.file) {
      this.postFn({
        type: 'progress',
        file: ev.file,
        loaded: ev.loaded ?? 0,
        total: ev.total ?? 0,
      });
    }
  }
}

async function initPipeline(model: string): Promise<void> {
  if (currentPipe && currentModel === model) {
    postMessage({ type: 'ready' });
    return;
  }
  if (currentPipe) {
    (currentPipe as any).dispose?.();
    currentPipe = null;
  }
  currentModel = model;
  try {
    currentPipe = await pipeline('text-generation', model, {
      dtype: 'q4',
      // @ts-ignore — progress_callback is valid at runtime
      progress_callback: new ProgressCallback(postMessage),
    });
    postMessage({ type: 'ready' });
  } catch (e: any) {
    currentPipe = null;
    currentModel = '';
    postMessage({ type: 'error', id: null, message: e?.message ?? 'Model load failed' });
  }
}

async function generate(
  id: string,
  messages: { role: string; content: string }[],
  maxTokens = 512,
): Promise<void> {
  if (!currentPipe) {
    postMessage({ type: 'error', id, message: 'Model not loaded. Please initialise first.' });
    return;
  }
  abortedIds.delete(id);
  try {
    let stopped = false;
    const streamer = new TextStreamer((currentPipe as any).tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        if (abortedIds.has(id)) {
          stopped = true;
          return;
        }
        if (text) postMessage({ type: 'chunk', id, text });
      },
    });

    await (currentPipe as any)(messages, {
      max_new_tokens: maxTokens,
      do_sample: false,
      temperature: 1.0,
      streamer,
    });

    postMessage({ type: 'done', id });
  } catch (e: any) {
    if (!abortedIds.has(id)) {
      postMessage({ type: 'error', id, message: e?.message ?? 'Inference failed' });
    }
    postMessage({ type: 'done', id });
  }
}

addEventListener('message', async ({ data }) => {
  switch (data.type) {
    case 'init':
      await initPipeline(data.model as string);
      break;
    case 'generate':
      await generate(data.id, data.messages, data.maxTokens);
      break;
    case 'abort':
      abortedIds.add(data.id as string);
      break;
  }
});
