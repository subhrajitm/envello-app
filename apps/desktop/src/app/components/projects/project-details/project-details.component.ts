import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '@envello/core';
import { Project } from '@envello/core';
import { MeetingsService } from '@envello/core';
import { BooksService } from '@envello/core';
import { ResearchService } from '@envello/core';
import { SnippetsService } from '@envello/core';
import { ArticleService } from '@envello/core';
import { JournalService } from '@envello/core';

@Component({
    selector: 'app-project-details',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './project-details.component.html',
    styleUrl: './project-details.component.css'
})
export class ProjectDetailsComponent {
    private route = inject(ActivatedRoute);
    public store = inject(StoreService);
    private router = inject(Router);

    private meetingsService = inject(MeetingsService);
    private booksService = inject(BooksService);
    private researchService = inject(ResearchService);
    private snippetsService = inject(SnippetsService);
    private articleService = inject(ArticleService);
    private journalService = inject(JournalService);

    projectId = signal<string | null>(null);
    newTaskTitle = signal('');

    project = computed(() => {
        const id = this.projectId();
        if (!id) return null;
        return this.store.projects().find(p => p.id === id) || null;
    });

    // Filter tasks for this project
    projectTasks = computed(() => {
        const p = this.project();
        if (!p) return [];
        return this.store.tasks().filter(t => t.project === p.id);
    });

    linkedNovels = computed(() => {
        const p = this.project();
        if (!p || !p.linkedResources?.novels) return [];
        return this.store.novels().filter(n => p.linkedResources?.novels?.includes(n.id));
    });

    linkedJournals = computed(() => {
        const p = this.project();
        if (!p || !p.linkedResources?.journals) return [];
        return this.store.notes().filter(n => p.linkedResources?.journals?.includes(n.id));
    });

    linkedMeetings = computed(() => {
        const p = this.project();
        if (!p || !p.linkedResources?.meetings) return [];
        return this.meetingsService.meetings().filter(m => p.linkedResources?.meetings?.includes(m.id));
    });

    linkedBooks = computed(() => {
        const p = this.project();
        if (!p || !p.linkedResources?.books) return [];
        return this.booksService.books().filter(b => p.linkedResources?.books?.includes(b.id));
    });

    linkedResearch = computed(() => {
        const p = this.project();
        // Assuming we link to Libraries, but code above supported linking to what?
        // ResearchService addLibrary linked to library.id using 'research' key.
        if (!p || !p.linkedResources?.research) return [];
        return this.researchService.libraries().filter(lib => p.linkedResources?.research?.includes(lib.id));
    });

    linkedSnippets = computed(() => {
        const p = this.project();
        if (!p || !p.linkedResources?.snippets) return [];
        return this.snippetsService.snippets().filter(s => p.linkedResources?.snippets?.includes(s.id));
    });

    linkedArticles = computed(() => {
        const p = this.project();
        if (!p || !p.linkedResources?.articles) return [];
        return this.articleService.articles().filter(a => p.linkedResources?.articles?.includes(a.id));
    });

    linkedJournalProjects = computed(() => {
        const p = this.project();
        if (!p || !p.linkedResources?.journals) return [];
        // Check JournalService for these IDs
        return this.journalService.projects().filter(jp => p.linkedResources?.journals?.includes(jp.id));
    });

    constructor() {
        this.route.paramMap.subscribe(params => {
            this.projectId.set(params.get('id'));
        });
    }

    addTask() {
        const title = this.newTaskTitle().trim();
        const p = this.project();
        if (!title || !p) return;

        this.store.addTask({
            id: crypto.randomUUID(),
            title,
            status: 'ACTIVE',
            project: p.id,
            priority: 'MEDIUM',
            hours: '0',
            due: new Date().toISOString().split('T')[0] // today
        });

        this.newTaskTitle.set('');
    }

    deleteTask(taskId: string) {
        this.store.deleteTask(taskId);
    }

    finalizeSession() {
        // Navigate back to project oversight or workspace
        this.router.navigate(['/workspace']);
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'DRAFTING': return 'status-yellow';
            case 'PLANNING': return 'status-blue';
            case 'COMPLETE': return 'status-green';
            case 'REVIEW': return 'status-orange';
            default: return 'status-gray';
        }
    }

    getPriorityColor(priority?: string): string {
        switch (priority) {
            case 'HIGH': return 'priority-high';
            case 'MEDIUM': return 'priority-medium';
            case 'LOW': return 'priority-low';
            default: return 'priority-none';
        }
    }
}
