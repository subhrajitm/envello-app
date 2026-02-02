import { Injectable, inject, signal } from '@angular/core';
import { AiService } from './ai.service';

@Injectable({
    providedIn: 'root'
})
export class VoiceService {
    private aiService = inject(AiService);

    // State Signals
    listening = signal(false);
    processedText = signal('');
    liveStatus = signal(''); // e.g., "Listening...", "Transcribing..."
    error = signal<string | null>(null);

    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (e) => {
                // Shortcut: Ctrl+Space for quick toggle
                if (e.ctrlKey && e.code === 'Space') {
                    e.preventDefault();
                    this.toggleVoice();
                }
            });
        }
    }

    async toggleVoice() {
        if (this.listening()) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    private lastActiveElement: HTMLElement | null = null;
    private lastRange: Range | null = null;

    private async startRecording() {
        this.error.set(null);

        // Capture Focus State
        this.lastActiveElement = document.activeElement as HTMLElement;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            this.lastRange = selection.getRangeAt(0);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.liveStatus.set('Transcribing (Local Whisper)...');

                try {
                    const text = await this.aiService.transcribeAudio(audioBlob);

                    if (!text) {
                        this.liveStatus.set('');
                        return;
                    }

                    this.processedText.set(text);
                    this.liveStatus.set('');

                    // Direct Insert Feature
                    // Restore focus first
                    this.restoreFocus();
                    this.insertTextIntoActiveElement(text, this.lastActiveElement);
                } catch (error: any) {
                    console.error('Transcription failed:', error);
                    this.liveStatus.set('');
                    this.error.set(error.message || 'Transcription failed');
                }

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.listening.set(true);
            this.processedText.set('');
            this.liveStatus.set('Listening...');
        } catch (error: any) {
            console.error('Error accessing microphone:', error);
            this.error.set('Could not access microphone: ' + error.message);
        }
    }

    private stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.listening.set(false);
        }
    }

    private restoreFocus() {
        if (this.lastActiveElement) {
            this.lastActiveElement.focus();
            // Restore selection for ContentEditable if possible
            if (this.lastRange && this.lastActiveElement.isContentEditable) {
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(this.lastRange);
                }
            }
        }
    }

    private insertTextIntoActiveElement(text: string, targetElement: HTMLElement | null = null) {
        // Use provided target or fall back to current active element
        const activeEl = targetElement || (document.activeElement as HTMLElement);
        if (!activeEl) return;

        // 1. ContentEditable (TipTap / Rich Text)
        if (activeEl.isContentEditable) {
            document.execCommand('insertText', false, text);
            return;
        }

        // 2. Input / Textarea
        if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
            const start = activeEl.selectionStart || 0;
            const end = activeEl.selectionEnd || 0;
            const value = activeEl.value;
            activeEl.value = value.substring(0, start) + text + value.substring(end);
            activeEl.selectionStart = activeEl.selectionEnd = start + text.length;

            activeEl.dispatchEvent(new Event('input', { bubbles: true }));
            activeEl.dispatchEvent(new Event('change', { bubbles: true })); // Ensure change detection
        }
    }
}
