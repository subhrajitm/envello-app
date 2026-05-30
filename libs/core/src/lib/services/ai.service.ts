import { Injectable, signal, effect, inject } from '@angular/core';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatXAI } from '@langchain/xai';
import { SupabaseService } from './supabase.service';

export type AiProvider = 'openai' | 'anthropic' | 'ollama' | 'mock' | 'grok' | 'gemini' | 'deepseek' | 'local';

export type LocalModelStatus = 'idle' | 'downloading' | 'ready' | 'error';

export interface AiMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    context?: string;
}

export interface AiSuggestion {
    id: string;
    type: 'improvement' | 'continuation' | 'analysis' | 'summary';
    content: string;
    originalText?: string;
    position?: number;
}

@Injectable({
    providedIn: 'root'
})
export class AiService {
    aiEnabled = signal<boolean>(true);
    provider = signal<AiProvider>('mock');
    modelName = signal<string>('gpt-4o');
    apiKey = signal<string>('');

    /** Status of the on-device model worker */
    localModelStatus = signal<LocalModelStatus>('idle');
    /** Download progress 0–100 */
    localDownloadProgress = signal<number>(0);
    /** Currently downloading file name */
    localDownloadFile = signal<string>('');

    private chatModel?: BaseChatModel;
    private sb = inject(SupabaseService);

    private localWorker: Worker | null = null;
    private localCurrentModel = '';
    /** Pending streaming callbacks keyed by generation ID */
    private localCallbacks = new Map<string, { chunk: (t: string) => void; done: () => void; error: (m: string) => void }>();

    // Platform-level fallback config loaded from Supabase on init
    private platformProvider: AiProvider = 'mock';
    private platformModel = '';
    private platformKey = '';

    /**
     * API keys are sensitive. On Tauri (desktop) the webview storage is sandboxed
     * to the app data directory, so localStorage is acceptable. On web we use
     * sessionStorage — the key clears when the tab closes, reducing XSS exposure.
     */
    private readonly keyStorage: Storage =
        typeof (window as any).__TAURI_INTERNALS__ !== 'undefined'
            ? localStorage
            : sessionStorage;

    constructor() {
        // Non-sensitive settings persist across sessions
        const savedEnabled = localStorage.getItem('ai-enabled');
        if (savedEnabled !== null) this.aiEnabled.set(savedEnabled === 'true');

        const savedProvider = localStorage.getItem('ai-provider') as AiProvider;
        if (savedProvider) this.provider.set(savedProvider);

        const savedModel = localStorage.getItem('ai-model');
        if (savedModel) this.modelName.set(savedModel);

        // API key stored in session-scoped storage
        const savedKey = this.keyStorage.getItem('ai-key');
        if (savedKey) this.apiKey.set(savedKey);

        // Load platform config as fallback, then init model
        this.loadPlatformConfig().then(() => this.initModel());

        // Persist settings; key goes to session-scoped storage
        effect(() => {
            localStorage.setItem('ai-enabled', String(this.aiEnabled()));
            localStorage.setItem('ai-provider', this.provider());
            localStorage.setItem('ai-model', this.modelName());
            this.keyStorage.setItem('ai-key', this.apiKey());
        });
    }

    private async loadPlatformConfig() {
        try {
            const { data } = await this.sb.client
                .from('platform_ai_config')
                .select('provider, model_name, api_key, ai_enabled')
                .single();
            if (data) {
                this.platformProvider = (data.provider as AiProvider) ?? 'mock';
                this.platformModel = data.model_name ?? '';
                this.platformKey = data.api_key ?? '';
                // Only override local enabled flag if no user preference saved
                if (localStorage.getItem('ai-enabled') === null) {
                    this.aiEnabled.set(data.ai_enabled ?? true);
                }
            }
        } catch {
            // Supabase not reachable — keep defaults
        }
    }

    updateConfig(provider: AiProvider, model: string, key: string) {
        this.provider.set(provider);
        if (model) this.modelName.set(model);
        if (key) this.apiKey.set(key);
        this.initModel();
    }

    private initModel() {
        // Effective config: user key takes priority; fall back to platform key
        const p = this.provider();
        const userKey = this.apiKey();
        const m = this.modelName();

        // Key-free providers (local, ollama, mock) are never overridden by platform config.
        // For key-requiring providers, fall back to platform key/provider when the user has none.
        const needsKey = p !== 'local' && p !== 'ollama' && p !== 'mock';
        const effectiveProvider = (needsKey && !userKey && this.platformKey) ? this.platformProvider : p;
        const effectiveKey = userKey || (needsKey ? this.platformKey : '');
        const effectiveModel = m || this.platformModel;

        try {
            if (effectiveProvider === 'local') {
                this.chatModel = undefined;
                this.initLocalWorker(effectiveModel || 'HuggingFaceTB/SmolLM2-360M-Instruct');
            } else if (effectiveProvider === 'openai' && effectiveKey) {
                this.chatModel = new ChatOpenAI({ model: effectiveModel, configuration: { apiKey: effectiveKey } });
            } else if (effectiveProvider === 'anthropic' && effectiveKey) {
                this.chatModel = new ChatAnthropic({ model: effectiveModel, apiKey: effectiveKey });
            } else if (effectiveProvider === 'ollama') {
                this.chatModel = new ChatOllama({ model: effectiveModel || 'llama3', baseUrl: 'http://localhost:11434' });
            } else if (effectiveProvider === 'grok' && effectiveKey) {
                this.chatModel = new ChatXAI({ model: effectiveModel, apiKey: effectiveKey });
            } else if (effectiveProvider === 'gemini' && effectiveKey) {
                this.chatModel = new ChatGoogleGenerativeAI({ model: effectiveModel, apiKey: effectiveKey });
            } else if (effectiveProvider === 'deepseek' && effectiveKey) {
                this.chatModel = new ChatOpenAI({
                    model: effectiveModel || 'deepseek-chat',
                    configuration: { apiKey: effectiveKey, baseURL: 'https://api.deepseek.com/v1' }
                });
            } else {
                this.chatModel = undefined; // Fallback to mock
            }
        } catch (e) {
            console.error('Failed to initialize AI model:', e);
            this.chatModel = undefined;
        }
    }

    private initLocalWorker(model: string) {
        // Worker is pre-created in apps/web/src/main.ts with the inline new Worker(new URL(...))
        // pattern required for esbuild/Vite to detect and compile it in dev + production.
        const worker = (globalThis as any).__AI_WORKER__ as Worker | undefined;
        if (!worker) {
            console.warn('[AiService] AI inference worker not available');
            this.localModelStatus.set('error');
            return;
        }

        // Skip if this exact model is already loading or loaded — avoid restarting the download.
        const currentStatus = this.localModelStatus();
        const alreadyActive = this.localWorker === worker
            && this.localCurrentModel === model
            && (currentStatus === 'downloading' || currentStatus === 'ready');
        if (alreadyActive) return;

        // Drain any pending generation callbacks before re-initialising.
        this.drainLocalCallbacks('Model reinitialized');

        this.localWorker = worker;
        this.localCurrentModel = model;
        this.localModelStatus.set('downloading');
        this.localDownloadProgress.set(0);
        this.localDownloadFile.set('');

        this.localWorker.onmessage = ({ data }: MessageEvent) => {
            switch (data.type) {
                case 'progress': {
                    const pct = data.total > 0 ? Math.round((data.loaded / data.total) * 100) : 0;
                    this.localDownloadProgress.set(pct);
                    this.localDownloadFile.set(data.file ?? '');
                    break;
                }
                case 'ready':
                    this.localModelStatus.set('ready');
                    this.localDownloadProgress.set(100);
                    break;
                case 'chunk': {
                    const cb = this.localCallbacks.get(data.id);
                    if (cb) cb.chunk(data.text);
                    break;
                }
                case 'done': {
                    const cb = this.localCallbacks.get(data.id);
                    if (cb) { cb.done(); this.localCallbacks.delete(data.id); }
                    break;
                }
                case 'error': {
                    if (data.id) {
                        const cb = this.localCallbacks.get(data.id);
                        if (cb) { cb.error(data.message); this.localCallbacks.delete(data.id); }
                    } else {
                        console.error('[AiService] Local worker error:', data.message);
                        this.localModelStatus.set('error');
                    }
                    break;
                }
            }
        };
        this.localWorker.onerror = (e) => {
            console.error('[AiService] Local worker crash:', e);
            this.localModelStatus.set('error');
            // Unblock any in-progress streamLocal generators so isProcessing doesn't hang.
            this.drainLocalCallbacks('Worker crashed');
        };
        this.localWorker.postMessage({ type: 'init', model });
    }

    private drainLocalCallbacks(reason: string) {
        for (const [, cb] of this.localCallbacks) {
            cb.error(reason);
        }
        this.localCallbacks.clear();
    }

    private async *streamLocal(
        messages: { role: string; content: string }[],
        maxTokens = 512,
    ): AsyncIterable<string> {
        if (!this.localWorker || this.localModelStatus() !== 'ready') {
            yield '[On-device model not ready — please wait for download to complete.]';
            return;
        }
        const id = crypto.randomUUID();
        const worker = this.localWorker;
        const queue: string[] = [];
        let finished = false;
        let pendingResolve: (() => void) | null = null;

        const waitForItem = (): Promise<void> =>
            new Promise(r => { pendingResolve = r; });

        this.localCallbacks.set(id, {
            chunk: (text: string) => {
                queue.push(text);
                if (pendingResolve) { const r = pendingResolve; pendingResolve = null; r(); }
            },
            done: () => {
                finished = true;
                if (pendingResolve) { const r = pendingResolve; pendingResolve = null; r(); }
            },
            error: (msg: string) => {
                queue.push(`[Error: ${msg}]`);
                finished = true;
                if (pendingResolve) { const r = pendingResolve; pendingResolve = null; r(); }
            },
        });

        worker.postMessage({ type: 'generate', id, messages, maxTokens });

        while (!finished || queue.length > 0) {
            if (queue.length === 0 && !finished) await waitForItem();
            while (queue.length > 0) yield queue.shift()!;
        }

        this.localCallbacks.delete(id);
    }

    private readonly REQUEST_TIMEOUT_MS = 60_000;
    private readonly TEST_TIMEOUT_MS = 15_000;

    private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`AI request timed out after ${ms / 1000}s`)), ms)
            ),
        ]);
    }

    private async logUsage(prompt: string, response: string) {
        try {
            const { data: { user } } = await this.sb.client.auth.getUser();
            if (!user) return;
            await this.sb.client.from('ai_usage_logs').insert({
                user_id: user.id,
                provider: this.provider(),
                model: this.modelName(),
                prompt_length: prompt.length,
                response_length: response.length,
            });
        } catch {
            // Non-critical — swallow errors silently
        }
    }

    toggleAi() {
        this.aiEnabled.set(!this.aiEnabled());
    }

    /**
     * Tests a provider configuration without saving it.
     * Returns 'success' or throws with an error message.
     */
    async testConfig(provider: AiProvider, model: string, key: string): Promise<void> {
        if (provider === 'mock') return;
        if (provider === 'local') {
            if (this.localModelStatus() === 'error') {
                throw new Error('Model failed to load. Check the browser console for details.');
            }
            // idle or downloading: trigger/re-use the worker and return success
            if (this.localModelStatus() === 'idle') {
                this.initLocalWorker(model || 'HuggingFaceTB/SmolLM2-360M-Instruct');
            }
            return; // success — progress indicator shows status
        }

        let tempModel: BaseChatModel | undefined;

        if (provider === 'openai' && key) {
            tempModel = new ChatOpenAI({ model, configuration: { apiKey: key } });
        } else if (provider === 'anthropic' && key) {
            tempModel = new ChatAnthropic({ model, apiKey: key });
        } else if (provider === 'ollama') {
            tempModel = new ChatOllama({ model: model || 'llama3', baseUrl: 'http://localhost:11434' });
        } else if (provider === 'grok' && key) {
            tempModel = new ChatXAI({ model, apiKey: key });
        } else if (provider === 'gemini' && key) {
            tempModel = new ChatGoogleGenerativeAI({ model, apiKey: key });
        } else if (provider === 'deepseek' && key) {
            tempModel = new ChatOpenAI({
                model: model || 'deepseek-chat',
                configuration: { apiKey: key, baseURL: 'https://api.deepseek.com/v1' }
            });
        } else {
            throw new Error('API key is required for this provider.');
        }

        const response = await this.withTimeout(tempModel.invoke([new HumanMessage('Hi')]), this.TEST_TIMEOUT_MS);
        if (!response.content) throw new Error('Empty response from model.');
    }

    async sendMessage(prompt: string, context?: string): Promise<string> {
        if (!this.aiEnabled()) return '';

        let result: string;
        if (this.provider() === 'local') {
            const msgs = [
                { role: 'system', content: context || 'You are a helpful creative writing assistant.' },
                { role: 'user', content: prompt },
            ];
            let full = '';
            for await (const chunk of this.streamLocal(msgs)) full += chunk;
            result = full;
        } else if (this.chatModel) {
            try {
                const messages = [
                    new SystemMessage(context || 'You are a helpful creative writing assistant.'),
                    new HumanMessage(prompt)
                ];
                const response = await this.withTimeout(this.chatModel.invoke(messages), this.REQUEST_TIMEOUT_MS);
                result = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            } catch (e) {
                console.error('AI Request failed:', e);
                result = await this.getMockResponse();
            }
        } else {
            result = await this.getMockResponse();
        }

        this.logUsage(prompt, result);
        return result;
    }

    async *streamMessage(prompt: string, context?: string): AsyncIterable<string> {
        if (!this.aiEnabled()) return;

        if (this.provider() === 'local') {
            const msgs = [
                { role: 'system', content: context || 'You are a helpful creative writing assistant.' },
                { role: 'user', content: prompt },
            ];
            yield* this.streamLocal(msgs);
            return;
        }

        if (this.chatModel) {
            const ac = new AbortController();
            const timeoutId = setTimeout(() => ac.abort(), this.REQUEST_TIMEOUT_MS);
            try {
                const messages = [
                    new SystemMessage(context || 'You are a helpful creative writing assistant.'),
                    new HumanMessage(prompt)
                ];
                const stream = await this.chatModel.stream(messages, { signal: ac.signal });
                for await (const chunk of stream) {
                    const text = typeof chunk.content === 'string'
                        ? chunk.content
                        : (chunk.content as any[]).map(c => (typeof c === 'string' ? c : (c as any).text ?? '')).join('');
                    if (text) yield text;
                }
                return;
            } catch (e) {
                if ((e as any)?.name === 'AbortError') {
                    console.error('[AiService] Stream timed out');
                } else {
                    console.error('AI stream failed:', e);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        }

        yield* this.getMockStream();
    }

    private async getMockResponse(): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const responses = [
            `[MOCK] Based on the context provided, I suggest focusing on character development...`,
            `[MOCK] Your writing shows strong descriptive language...`,
            `[MOCK] The chapter structure is solid...`,
            `[MOCK] This section demonstrates good narrative flow...`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    private async *getMockStream(): AsyncIterable<string> {
        const responses = [
            `[MOCK] Based on the context provided, I suggest focusing on character development and deepening the emotional resonance of your prose.`,
            `[MOCK] Your writing shows strong descriptive language. Consider varying sentence length for better rhythm and pacing.`,
            `[MOCK] The chapter structure is solid. Adding more sensory details could immerse readers more deeply in the scene.`,
            `[MOCK] This section demonstrates good narrative flow. The dialogue feels natural and advances character relationships.`
        ];
        const words = responses[Math.floor(Math.random() * responses.length)].split(' ');
        for (const word of words) {
            await new Promise(resolve => setTimeout(resolve, 60));
            yield word + ' ';
        }
    }

    async analyzeToneAndPacing(content: string): Promise<string> {
        if (this.chatModel) {
            return this.sendMessage(`Analyze the tone and pacing of the following text:\n\n${content}`, 'You are an expert literary editor.');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        return `**Tone Analysis:**\nThe overall tone is consistent and engaging.\n\n**Pacing Analysis:**\nThe pacing is well-balanced.`;
    }

    async generateSuggestions(content: string): Promise<AiSuggestion[]> {
        if (this.chatModel) {
            try {
                const prompt = `Read the following text and provide 2 improvement suggestions in strictly valid JSON format. 
                Output format: Array of objects with keys: id (string), type ("improvement"), content (string), originalText (string), position (number).
                Text: "${content.substring(0, 500)}..."`;

                const response = await this.sendMessage(prompt, 'You are a JSON-speaking writing assistant. Output ONLY JSON.');
                // clean markdown code blocks if present
                const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanJson);
            } catch (e) {
                console.error('Failed to parse AI JSON', e);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
        return [
            {
                id: '1',
                type: 'improvement',
                content: 'Consider increasing the tension here.',
                originalText: content.substring(0, 20),
                position: 0
            }
        ];
    }

    async summarizeContent(content: string): Promise<string> {
        return this.sendMessage(`Summarize the following content in 50 words or less:\n\n${content}`, 'You are a concise summarizer.');
    }

    async continueWriting(content: string, cursorPosition: number): Promise<string> {
        const preceding = content.substring(Math.max(0, cursorPosition - 1000), cursorPosition);
        return this.sendMessage(`Continue the story from this point (write 2-3 sentences):\n\n${preceding}`, 'You are a creative fiction writer.');
    }

    async improveText(selectedText: string): Promise<string> {
        return this.sendMessage(`Rewrite the following text to improve flow and descriptive quality:\n\n${selectedText}`, 'You are a master editor.');
    }

    async expandIdea(idea: string): Promise<string> {
        return this.sendMessage(`Expand this idea into a full paragraph:\n\n${idea}`, 'You are a creative writer.');
    }

    estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }
}
