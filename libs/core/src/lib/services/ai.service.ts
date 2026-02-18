import { Injectable, signal, effect } from '@angular/core';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type AiProvider = 'openai' | 'anthropic' | 'ollama' | 'mock';

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
    modelName = signal<string>('gpt-4-turbo');
    apiKey = signal<string>('');

    private chatModel?: BaseChatModel;

    constructor() {
        // Initialize from storage
        const savedEnabled = localStorage.getItem('ai-enabled');
        if (savedEnabled !== null) this.aiEnabled.set(savedEnabled === 'true');

        const savedProvider = localStorage.getItem('ai-provider') as AiProvider;
        if (savedProvider) this.provider.set(savedProvider);

        const savedModel = localStorage.getItem('ai-model');
        if (savedModel) this.modelName.set(savedModel);

        const savedKey = localStorage.getItem('ai-key');
        if (savedKey) this.apiKey.set(savedKey);

        // Initialize model
        this.initModel();

        // Effect to update Storage when signals change
        effect(() => {
            localStorage.setItem('ai-enabled', String(this.aiEnabled()));
            localStorage.setItem('ai-provider', this.provider());
            localStorage.setItem('ai-model', this.modelName());
            localStorage.setItem('ai-key', this.apiKey());
        });
    }

    updateConfig(provider: AiProvider, model: string, key: string) {
        this.provider.set(provider);
        this.modelName.set(model);
        this.apiKey.set(key);
        this.initModel();
    }

    private initModel() {
        const p = this.provider();
        const k = this.apiKey();
        const m = this.modelName();

        try {
            if (p === 'openai' && k) {
                this.chatModel = new ChatOpenAI({ openAIApiKey: k, modelName: m });
            } else if (p === 'anthropic' && k) {
                this.chatModel = new ChatAnthropic({ anthropicApiKey: k, modelName: m });
            } else if (p === 'ollama') {
                this.chatModel = new ChatOllama({ model: m || 'llama3', baseUrl: 'http://localhost:11434' });
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
