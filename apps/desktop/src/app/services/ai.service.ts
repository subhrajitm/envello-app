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

    constructor() {
        // Initialize from storage
        const saved = localStorage.getItem('ai-enabled');
        if (saved !== null) {
            this.aiEnabled.set(saved === 'true');
        }

        // Effect to update Storage when signal changes
        effect(() => {
            localStorage.setItem('ai-enabled', String(this.aiEnabled()));
        });
    }

    toggleAi() {
        this.aiEnabled.set(!this.aiEnabled());
    }

    // Simulate AI API calls - Replace with actual API integration
    async sendMessage(prompt: string, context?: string): Promise<string> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock response - Replace with actual API call
        const responses = [
            `Based on the context provided, I suggest focusing on character development in this section. The dialogue could be more natural, and the pacing might benefit from shorter paragraphs.`,
            `Your writing shows strong descriptive language. Consider adding more sensory details to immerse the reader further. The tension building is effective.`,
            `The chapter structure is solid. I notice opportunities to deepen emotional connections between characters. The plot progression is clear and engaging.`,
            `This section demonstrates good narrative flow. To enhance it further, consider varying sentence length and adding more internal character thoughts.`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    async analyzeToneAndPacing(content: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return `**Tone Analysis:**\nThe overall tone is consistent and engaging. The narrative voice maintains a professional yet accessible style.\n\n**Pacing Analysis:**\nThe pacing is well-balanced. Action sequences move quickly, while reflective moments allow for character development. Consider adding a brief pause after the climax to let the impact settle.`;
    }

    async generateSuggestions(content: string): Promise<AiSuggestion[]> {
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        const wordCount = content.split(/\s+/).length;
        return `This chapter (approximately ${wordCount} words) focuses on character development and plot progression. The main events include key narrative moments that advance the story toward its climax.`;
    }

    async continueWriting(content: string, cursorPosition: number): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'As if in response to his silent query, the air in the room shifted, growing heavier with the scent of ozone and old parchment. The shadows in the corner seemed to lengthen, stretching towards him like curious fingers.';
    }

    async improveText(selectedText: string, context?: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return `**Improved version:**\n${selectedText}\n\n**Changes made:**\n- Enhanced descriptive language\n- Improved sentence flow\n- Added emotional depth`;
    }

    async expandIdea(idea: string, context?: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return `**Expanded version:**\n${idea}\n\n**Additional context:**\nThis idea can be developed further by exploring the emotional implications, adding sensory details, and connecting it to the broader narrative themes.`;
    }

    estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
}
