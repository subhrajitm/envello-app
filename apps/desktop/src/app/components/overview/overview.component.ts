import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService, Project } from '../../services/store.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {
  store = inject(StoreService);
  private router = inject(Router);

  inputText = signal('');

  // Voice State
  listening = signal(false);
  processedScript = signal("Create a new sprint retrospective for the @design-team and schedule it for #next-tuesday"); // Default/Placeholder
  liveTranscript = signal('');
  confidence = signal(0);

  private recognition: any;
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      this.initSpeechRecognition();
    }
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.listening.set(true);
      this.confidence.set(0);
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
          // Create a running confidence average or take the latest
          const conf = event.results[i][0].confidence;
          this.confidence.set(Math.round(conf * 100));
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      // Update the display with what's being said
      if (final) {
        this.processedScript.set(final);
        this.liveTranscript.set(''); // Clear interim
      } else if (interim) {
        this.liveTranscript.set(interim);
      }
    };

    this.recognition.onend = () => {
      this.listening.set(false);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      this.listening.set(false);
    };
  }

  toggleVoice() {
    if (!this.recognition) return;

    if (this.listening()) {
      this.recognition.stop();
    } else {
      this.processedScript.set(''); // Clear previous on new start
      this.recognition.start();
    }
  }

  saveTask() {
    // Prefer manual input, then live transcript/result
    const voiceInput = this.liveTranscript() || this.processedScript();
    const finalInput = this.inputText().trim() || voiceInput;

    if (!finalInput || finalInput.length < 5) {
      alert('Please provide a command or task description.');
      return;
    }

    // AI Logic Simulation
    const lowerInput = finalInput.toLowerCase();
    const isNovelRequest = lowerInput.includes('novel') || lowerInput.includes('book') || lowerInput.includes('write a story');
    const isJournalRequest = lowerInput.includes('journal') || lowerInput.includes('diary') || lowerInput.includes('note');
    const isCodeRequest = lowerInput.includes('code') || lowerInput.includes('script') || lowerInput.includes('snippet') || lowerInput.includes('function');

    const projectTitle = this.extractTitle(finalInput);
    const projectId = crypto.randomUUID();
    const linkedResources: any = { novels: [], journals: [], snippets: [] };
    let projectType: 'SINGLE' | 'MULTI' = 'SINGLE';

    // 1. Handle Novel Creation
    if (isNovelRequest) {
      const novelId = crypto.randomUUID();
      this.store.addNovel({
        id: novelId,
        title: projectTitle + ' (Novel)',
        icon: 'menu_book',
        status: 'PLANNING',
        wordCount: 0,
        targetWordCount: 50000,
        progress: 0,
        chapters: 0,
        notesCount: 0,
        createdDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        genre: ['Fiction'],
        isRecentlyUpdated: true
      });
      linkedResources.novels.push(novelId);
      projectType = 'MULTI';
    }

    // 2. Handle Journal/Note Creation
    if (isJournalRequest) {
      const noteId = crypto.randomUUID();
      this.store.addNote({
        id: noteId,
        title: 'Project Journal: ' + projectTitle,
        date: new Date().toISOString(),
        preview: 'Initial thoughts for project ' + projectTitle,
        content: `<h1>${projectTitle} Journal</h1><p>Created automatically via voice command.</p>`,
        tags: ['Project', 'Voice'],
        lastEdited: new Date().toLocaleTimeString()
      });
      linkedResources.journals.push(noteId);
      projectType = 'MULTI';
    }

    // 3. Handle Code Snippet (Mocking Service Interaction)
    if (isCodeRequest) {
      // In a real app, we'd inject SnippetsService, but for now we'll just tag it
      // linkedResources.snippets.push('mock-snippet-id');
      projectType = 'MULTI';
    }

    const newProject: Project = {
      id: projectId,
      title: projectTitle,
      status: 'PLANNING',
      words: '0',
      updated: 'Just now',
      icon: isNovelRequest ? 'auto_stories' : (isCodeRequest ? 'terminal' : 'rocket_launch'),
      description: `Auto-generated ${projectType === 'MULTI' ? 'multi-resource ' : ''}project from command: "${finalInput}"`,
      priority: 'MEDIUM',
      progress: 0,
      tags: ['Voice-Created', ...(projectType === 'MULTI' ? ['Complex'] : [])],
      type: projectType,
      linkedResources
    };

    this.store.addProject(newProject);
    this.router.navigate(['/projects', newProject.id]);
  }

  discardTask() {
    this.inputText.set('');
    this.processedScript.set("Create a new sprint retrospective for the @design-team and schedule it for #next-tuesday");
    this.liveTranscript.set('');
    if (this.listening()) {
      this.recognition.stop();
    }
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
