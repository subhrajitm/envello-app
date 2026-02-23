import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  isVoiceActive = signal(false);
  private commandPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isCommandPressed = false;

  constructor() {
    this.initGlobalListeners();
  }

  toggleVoice() {
    this.isVoiceActive.set(!this.isVoiceActive());
  }

  private initGlobalListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (event) => {
      // Check for Meta key (Command on Mac, Windows key on Windows)
      if (event.key === 'Meta' && !this.isCommandPressed) {
        this.isCommandPressed = true;
        // Start long press timer (e.g., 500ms)
        this.commandPressTimer = setTimeout(() => {
          this.isVoiceActive.set(true); // Activate voice on long press
        }, 500);
      } else if (this.isCommandPressed && event.key !== 'Meta') {
        // Cancel if it's a shortcut combination like Cmd+C
        if (this.commandPressTimer) {
          clearTimeout(this.commandPressTimer);
          this.commandPressTimer = null;
        }
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.key === 'Meta') {
        this.isCommandPressed = false;
        if (this.commandPressTimer) {
          clearTimeout(this.commandPressTimer);
          this.commandPressTimer = null;
        }
        // Deactivate voice on release
        this.isVoiceActive.set(false);
      }
    });
  }
}
