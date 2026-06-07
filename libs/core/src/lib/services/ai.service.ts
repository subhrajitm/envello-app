import { Injectable, signal, effect, inject } from '@angular/core';
import { streamText, generateText } from 'ai';
import type { LanguageModel } from 'ai';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { SupabaseService } from './supabase.service';

export type AiProvider = 'openai' | 'anthropic' | 'ollama' | 'mock' | 'grok' | 'gemini' | 'deepseek' | 'local';
export type AiFeature = 'writing' | 'research' | 'summarize' | 'chat';
export interface AiFeatureConfig { provider: AiProvider; model: string; }

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
    featureConfigs = signal<Partial<Record<AiFeature, AiFeatureConfig>>>({});
    extraProviderKeys = signal<Partial<Record<AiProvider, string>>>({});

    localModelStatus = signal<LocalModelStatus>('idle');
    localDownloadProgress = signal<number>(0);
    localDownloadFile = signal<string>('');

    private currentModel?: LanguageModel;
    private sb = inject(SupabaseService);

    private localWorker: Worker | null = null;
    private localCurrentModel = '';
    private localCallbacks = new Map<string, { chunk: (t: string) => void; done: () => void; error: (m: string) => void }>();

    private platformProvider: AiProvider = 'mock';
    private platformModel = '';
    private platformKey = '';

    private readonly REQUEST_TIMEOUT_MS = 60_000;
    private readonly TEST_TIMEOUT_MS = 15_000;

    private readonly keyStorage: Storage =
        typeof (window as any).__TAURI_INTERNALS__ !== 'undefined'
            ? localStorage
            : sessionStorage;

    constructor() {
        const savedEnabled = localStorage.getItem('ai-enabled');
        if (savedEnabled !== null) this.aiEnabled.set(savedEnabled === 'true');

        const savedProvider = localStorage.getItem('ai-provider') as AiProvider;
        if (savedProvider) this.provider.set(savedProvider);

        const savedModel = localStorage.getItem('ai-model');
        if (savedModel) this.modelName.set(savedModel);

        const savedKey = this.keyStorage.getItem('ai-key');
        if (savedKey) this.apiKey.set(savedKey);

        const savedFc = localStorage.getItem('ai-feature-configs');
        if (savedFc) try { this.featureConfigs.set(JSON.parse(savedFc)); } catch {}
        const savedEk = this.keyStorage.getItem('ai-extra-keys');
        if (savedEk) try { this.extraProviderKeys.set(JSON.parse(savedEk)); } catch {}

        this.loadPlatformConfig().then(() => this.initModel());

        effect(() => {
            localStorage.setItem('ai-enabled', String(this.aiEnabled()));
            localStorage.setItem('ai-provider', this.provider());
            localStorage.setItem('ai-model', this.modelName());
            this.keyStorage.setItem('ai-key', this.apiKey());
            localStorage.setItem('ai-feature-configs', JSON.stringify(this.featureConfigs()));
            this.keyStorage.setItem('ai-extra-keys', JSON.stringify(this.extraProviderKeys()));
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

    updateFeatureConfig(feature: AiFeature, config: AiFeatureConfig | null) {
        this.featureConfigs.update(c => {
            const n = { ...c };
            if (config) n[feature] = config;
            else delete n[feature];
            return n;
        });
    }

    setExtraProviderKey(provider: AiProvider, key: string) {
        this.extraProviderKeys.update(k => ({ ...k, [provider]: key }));
    }

    getKeyForProvider(provider: AiProvider): string {
        if (provider === this.provider()) return this.apiKey();
        return this.extraProviderKeys()[provider] ?? '';
    }

    private resolveConfig(feature?: AiFeature): { model: LanguageModel | undefined; isLocal: boolean } {
        if (feature) {
            const fc = this.featureConfigs()[feature];
            if (fc) {
                const key = this.getKeyForProvider(fc.provider);
                return {
                    model: (fc.provider === 'local' || fc.provider === 'mock') ? undefined : this.buildModel(fc.provider, fc.model, key),
                    isLocal: fc.provider === 'local',
                };
            }
        }
        return { model: this.currentModel, isLocal: this.provider() === 'local' };
    }

    private buildModel(provider: AiProvider, model: string, key: string): LanguageModel | undefined {
        switch (provider) {
            case 'openai':
                return key ? createOpenAI({ apiKey: key })(model || 'gpt-4o') : undefined;
            case 'anthropic':
                return key ? createAnthropic({ apiKey: key })(model || 'claude-3-5-sonnet-20241022') : undefined;
            case 'gemini':
                return key ? createGoogleGenerativeAI({ apiKey: key })(model || 'gemini-1.5-flash') : undefined;
            case 'grok':
                return key ? createXai({ apiKey: key })(model || 'grok-3-fast') : undefined;
            case 'deepseek':
                return key ? createOpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com/v1' })(model || 'deepseek-chat') : undefined;
            case 'ollama':
                return createOpenAI({ apiKey: 'ollama', baseURL: 'http://localhost:11434/v1' })(model || 'llama3');
            default:
                return undefined;
        }
    }

    private initModel() {
        const p = this.provider();
        const userKey = this.apiKey();
        const m = this.modelName();

        const needsKey = p !== 'local' && p !== 'ollama' && p !== 'mock';
        const effectiveProvider = (needsKey && !userKey && this.platformKey) ? this.platformProvider : p;
        const effectiveKey = userKey || (needsKey ? this.platformKey : '');
        const effectiveModel = m || this.platformModel;

        if (effectiveProvider === 'local') {
            this.currentModel = undefined;
            this.initLocalWorker(effectiveModel || 'HuggingFaceTB/SmolLM2-360M-Instruct');
        } else {
            this.currentModel = this.buildModel(effectiveProvider, effectiveModel, effectiveKey);
        }
    }

    private initLocalWorker(model: string) {
        const worker = (globalThis as any).__AI_WORKER__ as Worker | undefined;
        if (!worker) {
            console.warn('[AiService] AI inference worker not available');
            this.localModelStatus.set('error');
            return;
        }

        const currentStatus = this.localModelStatus();
        const alreadyActive = this.localWorker === worker
            && this.localCurrentModel === model
            && (currentStatus === 'downloading' || currentStatus === 'ready');
        if (alreadyActive) return;

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
            this.drainLocalCallbacks('Worker crashed');
        };
        this.localWorker.postMessage({ type: 'init', model });
    }

    private drainLocalCallbacks(reason: string) {
        for (const [, cb] of this.localCallbacks) cb.error(reason);
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
            // Non-critical — swallow silently
        }
    }

    toggleAi() {
        this.aiEnabled.set(!this.aiEnabled());
    }

    async testConfig(provider: AiProvider, model: string, key: string): Promise<void> {
        if (provider === 'mock') return;
        if (provider === 'local') {
            if (this.localModelStatus() === 'error') {
                throw new Error('Model failed to load. Check the browser console for details.');
            }
            if (this.localModelStatus() === 'idle') {
                this.initLocalWorker(model || 'HuggingFaceTB/SmolLM2-360M-Instruct');
            }
            return;
        }

        const tempModel = this.buildModel(provider, model, key);
        if (!tempModel) throw new Error('API key is required for this provider.');

        const { text } = await generateText({
            model: tempModel,
            messages: [{ role: 'user', content: 'Hi' }],
            abortSignal: AbortSignal.timeout(this.TEST_TIMEOUT_MS),
        });
        if (!text) throw new Error('Empty response from model.');
    }

    async sendMessage(prompt: string, context?: string, feature?: AiFeature): Promise<string> {
        if (!this.aiEnabled()) return '';

        const { model, isLocal } = this.resolveConfig(feature);

        if (isLocal) {
            const msgs = [
                { role: 'system', content: context || 'You are a helpful creative writing assistant.' },
                { role: 'user', content: prompt },
            ];
            let full = '';
            for await (const chunk of this.streamLocal(msgs)) full += chunk;
            this.logUsage(prompt, full);
            return full;
        }

        if (model) {
            const messages: ChatMessage[] = [
                { role: 'system', content: context || 'You are a helpful creative writing assistant.' },
                { role: 'user', content: prompt },
            ];
            const { text } = await generateText({
                model,
                messages,
                abortSignal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
            });
            this.logUsage(prompt, text);
            return text;
        }

        return this.getMockResponse();
    }

    async *streamMessage(prompt: string, context?: string, feature?: AiFeature): AsyncIterable<string> {
        if (!this.aiEnabled()) return;

        const { model, isLocal } = this.resolveConfig(feature);

        if (isLocal) {
            const msgs = [
                { role: 'system', content: context || 'You are a helpful creative writing assistant.' },
                { role: 'user', content: prompt },
            ];
            yield* this.streamLocal(msgs);
            return;
        }

        if (model) {
            const messages: ChatMessage[] = [
                { role: 'system', content: context || 'You are a helpful creative writing assistant.' },
                { role: 'user', content: prompt },
            ];
            const { textStream } = streamText({
                model,
                messages,
                abortSignal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
            });
            for await (const chunk of textStream) yield chunk;
            return;
        }

        yield* this.getMockStream();
    }

    private getMockResponse(): Promise<string> {
        return new Promise(resolve => setTimeout(() => {
            const responses = [
                `[MOCK] Based on the context provided, I suggest focusing on character development...`,
                `[MOCK] Your writing shows strong descriptive language...`,
                `[MOCK] The chapter structure is solid...`,
                `[MOCK] This section demonstrates good narrative flow...`,
            ];
            resolve(responses[Math.floor(Math.random() * responses.length)]);
        }, 1500));
    }

    private async *getMockStream(): AsyncIterable<string> {
        const responses = [
            `[MOCK] Based on the context provided, I suggest focusing on character development and deepening the emotional resonance of your prose.`,
            `[MOCK] Your writing shows strong descriptive language. Consider varying sentence length for better rhythm and pacing.`,
            `[MOCK] The chapter structure is solid. Adding more sensory details could immerse readers more deeply in the scene.`,
            `[MOCK] This section demonstrates good narrative flow. The dialogue feels natural and advances character relationships.`,
        ];
        const words = responses[Math.floor(Math.random() * responses.length)].split(' ');
        for (const word of words) {
            await new Promise(resolve => setTimeout(resolve, 60));
            yield word + ' ';
        }
    }

    async analyzeToneAndPacing(content: string): Promise<string> {
        return this.sendMessage(
            `Analyze the tone and pacing of the following text:\n\n${content}`,
            'You are an expert literary editor.',
            'writing'
        );
    }

    async generateSuggestions(content: string): Promise<AiSuggestion[]> {
        try {
            const prompt = `Read the following text and provide 2 improvement suggestions in strictly valid JSON format.
            Output format: Array of objects with keys: id (string), type ("improvement"), content (string), originalText (string), position (number).
            Text: "${content.substring(0, 500)}..."`;
            const response = await this.sendMessage(prompt, 'You are a JSON-speaking writing assistant. Output ONLY JSON.', 'writing');
            if (response.startsWith('[MOCK]')) throw new Error('mock');
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch {
            return [{
                id: '1',
                type: 'improvement',
                content: 'Consider increasing the tension here.',
                originalText: content.substring(0, 20),
                position: 0,
            }];
        }
    }

    async summarizeContent(content: string): Promise<string> {
        return this.sendMessage(
            `Summarize the following content in 50 words or less:\n\n${content}`,
            'You are a concise summarizer.',
            'summarize'
        );
    }

    async continueWriting(content: string, cursorPosition: number): Promise<string> {
        const preceding = content.substring(Math.max(0, cursorPosition - 1000), cursorPosition);
        return this.sendMessage(
            `Continue the story from this point (write 2-3 sentences):\n\n${preceding}`,
            'You are a creative fiction writer.',
            'writing'
        );
    }

    async improveText(selectedText: string): Promise<string> {
        return this.sendMessage(
            `Rewrite the following text to improve flow and descriptive quality:\n\n${selectedText}`,
            'You are a master editor.',
            'writing'
        );
    }

    async expandIdea(idea: string): Promise<string> {
        return this.sendMessage(
            `Expand this idea into a full paragraph:\n\n${idea}`,
            'You are a creative writer.',
            'writing'
        );
    }

    estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }
}
