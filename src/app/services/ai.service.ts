import { Injectable, signal, effect } from '@angular/core';

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
}
