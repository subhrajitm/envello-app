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

    async toggleVoice() {
        if (this.listening()) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    private async startRecording() {
        this.error.set(null);
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
                    this.processedText.set(text);
                    this.liveStatus.set('');
                } catch (error: any) {
                    console.error('Transcription failed:', error);
                    this.liveStatus.set('');
                    this.error.set(error.message || 'Transcription failed');
                }

                // Stop all tracks to release mic
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
}
