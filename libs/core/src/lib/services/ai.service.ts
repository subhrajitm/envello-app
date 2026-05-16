import { Injectable, signal, effect } from '@angular/core';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatXAI } from '@langchain/xai';

export type AiProvider = 'openai' | 'anthropic' | 'ollama' | 'mock' | 'grok' | 'gemini' | 'deepseek';

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

    private chatModel?: BaseChatModel;

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

        // Initialize model
        this.initModel();

        // Persist settings; key goes to session-scoped storage
        effect(() => {
            localStorage.setItem('ai-enabled', String(this.aiEnabled()));
            localStorage.setItem('ai-provider', this.provider());
            localStorage.setItem('ai-model', this.modelName());
            this.keyStorage.setItem('ai-key', this.apiKey());
        });
    }

    updateConfig(provider: AiProvider, model: string, key: string) {
        this.provider.set(provider);
        if (model) this.modelName.set(model);
        if (key) this.apiKey.set(key);
        this.initModel();
    }

    private initModel() {
        const p = this.provider();
        const k = this.apiKey();
        const m = this.modelName();

        try {
            if (p === 'openai' && k) {
                this.chatModel = new ChatOpenAI({ model: m, configuration: { apiKey: k } });
            } else if (p === 'anthropic' && k) {
                this.chatModel = new ChatAnthropic({ model: m, apiKey: k });
            } else if (p === 'ollama') {
                this.chatModel = new ChatOllama({ model: m || 'llama3', baseUrl: 'http://localhost:11434' });
            } else if (p === 'grok' && k) {
                this.chatModel = new ChatXAI({ model: m, apiKey: k });
            } else if (p === 'gemini' && k) {
                this.chatModel = new ChatGoogleGenerativeAI({ model: m, apiKey: k });
            } else if (p === 'deepseek' && k) {
                this.chatModel = new ChatOpenAI({
                    model: m || 'deepseek-chat',
                    configuration: { apiKey: k, baseURL: 'https://api.deepseek.com/v1' }
                });
            } else {
                this.chatModel = undefined; // Fallback to mock
            }
        } catch (e) {
            console.error('Failed to initialize AI model:', e);
            this.chatModel = undefined;
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
        } else if (provider === 'mock') {
            return; // Mock always succeeds
        } else {
            throw new Error('API key is required for this provider.');
        }

        const response = await tempModel.invoke([new HumanMessage('Hi')]);
        if (!response.content) throw new Error('Empty response from model.');
    }

    async sendMessage(prompt: string, context?: string): Promise<string> {
        if (!this.aiEnabled()) return '';

        if (this.chatModel) {
            try {
                const messages = [
                    new SystemMessage(context || 'You are a helpful creative writing assistant.'),
                    new HumanMessage(prompt)
                ];
                const response = await this.chatModel.invoke(messages);
                return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            } catch (e) {
                console.error('AI Request failed:', e);
                return this.getMockResponse();
            }
        }

        return this.getMockResponse();
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

    async improveText(selectedText: string, context?: string): Promise<string> {
        return this.sendMessage(`Rewrite the following text to improve flow and descriptive quality:\n\n${selectedText}`, 'You are a master editor.');
    }

    async expandIdea(idea: string, context?: string): Promise<string> {
        return this.sendMessage(`Expand this idea into a full paragraph:\n\n${idea}`, 'You are a creative writer.');
    }

    estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }
}
