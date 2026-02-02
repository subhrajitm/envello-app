import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService, Project } from '../../services/store.service';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {
  store = inject(StoreService);
  public router = inject(Router);

  inputText = signal('');

  // No local voice logic needed here as it's handled by global app-voice-assistant
  toggleVoice() {
    // Optional: Trigger global voice assistant if wanted, or just remove
    alert('Please use the global voice assistant (Bottom Right) for commands.');
  }

  saveTask() {
    const finalInput = this.inputText().trim();
    if (finalInput) {
      // Just navigate to voice assistant for now or implement simple save? 
      // For "Overview", maybe we just want to search or do nothing if voice is main.
      // Let's keep it simple:
      alert('Manual task creation not yet reimplemented in overview. Try the voice assistant!');
    }
  }

  discardTask() {
    this.inputText.set('');
  }

  private extractTitle(text: string): string {
    // Heuristic: Take first few words or split by common prepositions
    const stopWords = [' for ', ' at ', ' on ', ' with ', ' about ', ' to '];
    let title = text;
    for (const word of stopWords) {
      if (title.toLowerCase().includes(word)) {
        title = title.split(new RegExp(word, 'i'))[0];
        break;
      }
    }
    // Remove "Create", "Start", "Write" verbs if present
    return title.replace(/^(create|add|new|make|start|write) (a )?/i, '').trim();
  }
}
