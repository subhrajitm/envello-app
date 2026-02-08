import { Injectable, signal, effect } from '@angular/core';

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
    aiEnabled = signal<boolean>(true); // Default to enabled
    config = signal<AiConfig>({
        provider: 'mock',
        model: 'gpt-3.5-turbo',
        temperature: 0.7
    });

    constructor() {
        // Initialize from storage
        const savedEnabled = localStorage.getItem('ai-enabled');
        if (savedEnabled !== null) {
            this.aiEnabled.set(savedEnabled === 'true');
        }

        const savedConfig = localStorage.getItem('ai-config');
        if (savedConfig) {
            try {
                this.config.set(JSON.parse(savedConfig));
            } catch (e) {
                console.error('Failed to parse saved AI config', e);
            }
        }

        // Effect to update Storage when signals change
        effect(() => {
            localStorage.setItem('ai-enabled', String(this.aiEnabled()));
        });

        effect(() => {
            localStorage.setItem('ai-config', JSON.stringify(this.config()));
        });
    }

    toggleAi() {
        this.aiEnabled.set(!this.aiEnabled());
    }

    updateConfig(newConfig: Partial<AiConfig>) {
        this.config.update(current => ({ ...current, ...newConfig }));
    }

    // Main AI interacting method
    async sendMessage(prompt: string, context?: string): Promise<string> {
        if (!this.aiEnabled()) throw new Error('AI is disabled');

        const conf = this.config();

        try {
            switch (conf.provider) {
                case 'openai':
                    return this.callOpenAi(prompt, context);
                case 'anthropic':
                    return this.callAnthropic(prompt, context);
                case 'ollama':
                    return this.callOllama(prompt, context);
                case 'mock':
                default:
                    return this.mockSendMessage(prompt);
            }
        } catch (error) {
            console.error('AI Service Error:', error);
            // Fallback to mock on error if not already mock
            if (conf.provider !== 'mock') {
                return `Error using ${conf.provider}: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to mock response.\n\n` + await this.mockSendMessage(prompt);
            }
            throw error;
        }
    }

    // Provider Implementations

    private async callOpenAi(prompt: string, context?: string): Promise<string> {
        if (!this.config().apiKey) throw new Error('OpenAI API Key missing');

        const messages = [
            { role: 'system', content: 'You are a helpful creative writing assistant. Analyze the user\'s request and context to provide helpful, constructive, and creative feedback or content.' },
            ...(context ? [{ role: 'user', content: `Context:\n${context}` }] : []),
            { role: 'user', content: prompt }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config().apiKey}`
            },
            body: JSON.stringify({
                model: this.config().model || 'gpt-3.5-turbo',
                messages: messages,
                temperature: this.config().temperature ?? 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'OpenAI API failed');
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    private async callAnthropic(prompt: string, context?: string): Promise<string> {
        if (!this.config().apiKey) throw new Error('Anthropic API Key missing');

        // Anthropic requires a different format
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config().apiKey!,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.config().model || 'claude-3-opus-20240229',
                max_tokens: 1024,
                messages: [
                    ...(context ? [{ role: 'user', content: `Context:\n${context}` }] : []),
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Anthropic API failed');
        }

        const data = await response.json();
        return data.content[0]?.text || '';
    }

    private async callOllama(prompt: string, context?: string): Promise<string> {
        const baseUrl = this.config().baseUrl || 'http://localhost:11434';

        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.config().model || 'llama2',
                prompt: context ? `Context: ${context}\n\nUser: ${prompt}` : prompt,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error('Ollama API failed');
        }

        const data = await response.json();
        return data.response;
    }

    // Mock Implementation
    private async mockSendMessage(prompt: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const responses = [
            `Based on the context provided, I suggest focusing on character development in this section. The dialogue could be more natural, and the pacing might benefit from shorter paragraphs.`,
            `Your writing shows strong descriptive language. Consider adding more sensory details to immerse the reader further. The tension building is effective.`,
            `The chapter structure is solid. I notice opportunities to deepen emotional connections between characters. The plot progression is clear and engaging.`,
            `This section demonstrates good narrative flow. To enhance it further, consider varying sentence length and adding more internal character thoughts.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    async analyzeToneAndPacing(content: string): Promise<string> {
        // For simple analysis, we can use the main chat endpoint with a specific prompt
        return this.sendMessage('Analyze the tone and pacing of the following text:', content);
    }

    async generateSuggestions(content: string): Promise<AiSuggestion[]> {
        // This would require structured output which is complex to implement generically.
        // For now, keeping mock for complex structured data unless we parse JSON from LLM.
        await new Promise(resolve => setTimeout(resolve, 1500));
        return [
            {
                id: '1',
                type: 'improvement',
                content: 'Consider increasing the tension by delaying the response to the signal.',
                originalText: 'The signal came through immediately.',
                position: 0
            },
            {
                id: '2',
                type: 'improvement',
                content: 'Add more sensory details to this description to enhance immersion.',
                originalText: 'The room was dark.',
                position: 0
            }
        ];
    }

    async summarizeContent(content: string): Promise<string> {
        return this.sendMessage('Summarize the following text in 2-3 sentences:', content);
    }

    async continueWriting(content: string, cursorPosition: number): Promise<string> {
        return this.sendMessage('Continue writing the following text for one paragraph:', content);
    }

    async improveText(selectedText: string, context?: string): Promise<string> {
        return this.sendMessage('Rewrite the following text to improve flow and descriptiveness:', selectedText);
    }

    async expandIdea(idea: string, context?: string): Promise<string> {
        return this.sendMessage('Expand on the following idea with more details and potential plot points:', idea);
    }

    estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
}

export interface AiConfig {
    provider: 'mock' | 'openai' | 'anthropic' | 'ollama';
    apiKey?: string;
    model?: string;
    baseUrl?: string; // For Ollama
    temperature?: number;
}
