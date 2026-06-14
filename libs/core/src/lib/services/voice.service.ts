import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  isVoiceActive = signal(false);
  private commandPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isControlPressed = false;
  private recognition: any = null;
  private isRecognizing = false;

  constructor() {
    this.initGlobalListeners();
    this.initSpeechRecognition();
  }

  toggleVoice() {
    const newState = !this.isVoiceActive();
    this.isVoiceActive.set(newState);
    this.handleRecognitionState(newState);
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    // Type casting to avoid TypeScript errors for Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isRecognizing = true;
      };

      this.recognition.onend = () => {
        this.isRecognizing = false;
        // Only restart if voice is active AND the user is still holding Ctrl
        // (prevents infinite loops on error-triggered ends)
        if (this.isVoiceActive() && this.isControlPressed) {
          try {
            this.recognition.start();
          } catch (e) {
            console.error('Error restarting speech recognition:', e);
          }
        }
      };

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        
        if (transcript) {
           this.insertTextAtCursor(transcript);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          console.error('Voice: microphone/speech-recognition access denied. Check System Settings → Privacy & Security, and ensure the app has NSMicrophoneUsageDescription + NSSpeechRecognitionUsageDescription in Info.plist.');
          this.isVoiceActive.set(false);
          this.isRecognizing = false;
          this.isControlPressed = false;
        } else if (event.error === 'network') {
          console.error('Voice: network error — speech recognition requires internet access to Apple servers.');
          this.isVoiceActive.set(false);
          this.isRecognizing = false;
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
          this.isVoiceActive.set(false);
          this.isRecognizing = false;
        }
      };
    } else {
      console.warn('Voice: Web Speech API not available in this environment.');
    }
  }

  private handleRecognitionState(isActive: boolean) {
    if (!this.recognition) return;

    try {
      if (isActive && !this.isRecognizing) {
        this.recognition.start();
      } else if (!isActive && this.isRecognizing) {
        this.recognition.stop();
      }
    } catch (e) {
      console.error(e);
    }
  }

  private insertTextAtCursor(text: string) {
    const activeEl = document.activeElement as HTMLElement | HTMLInputElement | HTMLTextAreaElement;
    if (!activeEl) return;

    // Check if the element is an input or textarea
    if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
        // Prevent editing read only or disabled fields
        if (activeEl.readOnly || activeEl.disabled) return;
        
        const start = activeEl.selectionStart || 0;
        const end = activeEl.selectionEnd || 0;
        const value = activeEl.value;
        const textToInsert = (start > 0 && value[start - 1] !== ' ' && !text.startsWith(' ')) ? ' ' + text : text;
        
        activeEl.value = value.substring(0, start) + textToInsert + value.substring(end);
        activeEl.selectionStart = activeEl.selectionEnd = start + textToInsert.length;
        
        // Dispatch input event for Angular
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (activeEl.isContentEditable) {
        // For rich text editors or contenteditable div
        // Ensure starting space if needed
        const selection = window.getSelection();
        let addSpace = true;
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (range.startContainer && range.startOffset > 0) {
              const prevText = range.startContainer.textContent;
              if (prevText && prevText[range.startOffset - 1] === ' ') addSpace = false;
            } else {
              addSpace = false;
            }
        }
        
        const textToInsert = (addSpace && !text.startsWith(' ')) ? ' ' + text : text;
        document.execCommand('insertText', false, textToInsert);
    }
  }

  private initGlobalListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Control' && !this.isControlPressed) {
        this.isControlPressed = true;
        // Start recognition immediately — WKWebView requires getUserMedia/speech to be
        // initiated within a direct user-gesture frame; setTimeout breaks that guarantee.
        this.handleRecognitionState(true);
        // Show the visual mic-active state only after the hold threshold
        this.commandPressTimer = setTimeout(() => {
          this.isVoiceActive.set(true);
        }, 500);
      } else if (this.isControlPressed && event.key !== 'Control') {
        // Ctrl+<key> shortcut — cancel voice, don't activate
        if (this.commandPressTimer) {
          clearTimeout(this.commandPressTimer);
          this.commandPressTimer = null;
        }
        this.handleRecognitionState(false);
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.key === 'Control') {
        this.isControlPressed = false;
        if (this.commandPressTimer) {
          clearTimeout(this.commandPressTimer);
          this.commandPressTimer = null;
        }
        this.isVoiceActive.set(false);
        this.handleRecognitionState(false);
      }
    });
  }
}
