import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceService } from '../../../services/voice.service';
import { StoreService } from '../../../services/store.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-voice-assistant',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './voice-assistant.component.html',
    styleUrl: './voice-assistant.component.css'
})
export class VoiceAssistantComponent {
    voice = inject(VoiceService);
    store = inject(StoreService);
    router = inject(Router);

    isExpanded = computed(() => this.voice.listening() || !!this.voice.processedText() || !!this.voice.liveStatus());

    toggleRecording() {
        this.voice.toggleVoice();
    }

    copyText() {
        const text = this.voice.processedText();
        if (text) {
            navigator.clipboard.writeText(text);
            // could show toast here
        }
    }

    discard() {
        this.voice.processedText.set('');
        this.voice.error.set(null);
    }

    // Basic Command Parsing Logic (Moved from Overview)
    executeCommand() {
        const text = this.voice.processedText();
        if (!text) return;

        // Reuse the logic we had in Overview for Project Creation
        const lowerInput = text.toLowerCase();

        // 1. Check for Project/Novel/Journal Creation
        if (lowerInput.includes('create') || lowerInput.includes('start') || lowerInput.includes('new project')) {
            this.handleCreationCommand(text, lowerInput);
            return;
        }

        // Default: Just Copy? Or Alert?
        alert('Command not recognized. Copied to clipboard.');
        this.copyText();
    }

    private handleCreationCommand(text: string, lowerInput: string) {
        const isNovel = lowerInput.includes('novel') || lowerInput.includes('book') || lowerInput.includes('story');
        const isJournal = lowerInput.includes('journal') || lowerInput.includes('note') || lowerInput.includes('diary');
        const isCode = lowerInput.includes('code');

        // Extract title
        const title = text.replace(/^(create|add|new|make|start|write) (a )?/i, '').trim();
        const projectId = crypto.randomUUID();
        const linkedResources: any = { novels: [], journals: [], snippets: [] }; // simplfied
        let projectType: 'SINGLE' | 'MULTI' = 'SINGLE';

        if (isNovel) {
            const novelId = crypto.randomUUID();
            this.store.addNovel({
                id: novelId, title: title + ' (Novel)', icon: 'menu_book', status: 'PLANNING',
                wordCount: 0, targetWordCount: 50000, progress: 0, chapters: 0, notesCount: 0,
                createdDate: new Date().toISOString(), lastUpdated: new Date().toISOString(),
                genre: ['Fiction'], isRecentlyUpdated: true
            });
            linkedResources.novels.push(novelId);
            projectType = 'MULTI';
        }

        if (isJournal) {
            const noteId = crypto.randomUUID();
            this.store.addNote({
                id: noteId, title: 'Journal: ' + title, date: new Date().toISOString(),
                preview: 'Init', content: `<h1>${title}</h1>`, tags: ['Voice'], lastEdited: new Date().toLocaleTimeString()
            });
            linkedResources.journals.push(noteId);
            projectType = 'MULTI';
        }

        const newProject = {
            id: projectId,
            title: title,
            status: 'PLANNING' as any,
            words: '0',
            updated: 'Just now',
            icon: isNovel ? 'auto_stories' : 'rocket_launch',
            description: `Voice Command: ${text}`,
            priority: 'MEDIUM' as any,
            progress: 0,
            tags: ['Voice'],
            type: projectType,
            linkedResources
        };

        this.store.addProject(newProject);
        this.voice.processedText.set(''); // Clear
        this.router.navigate(['/projects', newProject.id]);
    }
}
