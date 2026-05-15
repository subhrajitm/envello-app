/// <reference lib="webworker" />

/**
 * Web Worker for converting HTML → Markdown using Turndown.
 * Runs off the main thread so large note saves never block the UI.
 *
 * Message in:  { id: string; html: string }
 * Message out: { id: string; markdown: string } | { id: string; error: string }
 */

let turndownService: any = null;

async function getTurndown(): Promise<any> {
  if (turndownService) return turndownService;
  const { default: TurndownService } = await import('turndown');
  turndownService = new TurndownService();
  turndownService.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: (content: string) => '~' + content + '~'
  });
  return turndownService;
}

addEventListener('message', async ({ data }: MessageEvent<{ id: string; html: string }>) => {
  try {
    const svc = await getTurndown();
    const markdown = svc.turndown(data.html);
    postMessage({ id: data.id, markdown });
  } catch (e: any) {
    postMessage({ id: data.id, error: e?.message ?? 'Worker error' });
  }
});
