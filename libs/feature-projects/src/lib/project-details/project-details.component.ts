import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { StoreService, Project, MeetingsService, BooksService, ResearchService, ArticleService, EncryptionUtil } from '@envello/core';
import { VaultStore, SubscriptionStore, LinkStore } from '@envello/state';

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
    private destroyRef = inject(DestroyRef);

    private meetingsService = inject(MeetingsService);
    private booksService = inject(BooksService);
    private researchService = inject(ResearchService);
    private articleService = inject(ArticleService);

    public vaultStore = inject(VaultStore);
    public subscriptionStore = inject(SubscriptionStore);
    public linkStore = inject(LinkStore);

    activeTab = signal<'OVERVIEW' | 'VAULT' | 'SUBSCRIPTIONS'>('OVERVIEW');

    projectId = signal<string | null>(null);
    newTaskTitle = signal('');

    // Edit mode for project metadata
    editMode = signal(false);
    editTitle = signal('');
    editDescription = signal('');
    editStatus = signal<Project['status']>('PLANNING');

    project = computed(() => {
        const id = this.projectId();
        if (!id) return null;
        return this.store.projects().find(p => p.id === id) || null;
    });

    projectTasks = computed(() => {
        const p = this.project();
        if (!p) return [];
        return this.store.tasks().filter(t => t.project === p.id);
    });

    activeTasks = computed(() => this.projectTasks().filter(t => t.status === 'ACTIVE'));
    pendingTasks = computed(() => this.projectTasks().filter(t => t.status === 'PENDING'));
    completedTasks = computed(() => this.projectTasks().filter(t => t.status === 'COMPLETED'));

    linkedNovels = computed(() => {
        const p = this.project();
        if (!p?.linkedResources?.novels?.length) return [];
        return this.store.novels().filter(n => p.linkedResources!.novels!.includes(n.id));
    });

    linkedNotes = computed(() => {
        const p = this.project();
        if (!p?.linkedResources?.notes?.length) return [];
        return this.store.notes().filter(n => p.linkedResources!.notes!.includes(n.id));
    });

    linkedMeetings = computed(() => {
        const p = this.project();
        if (!p?.linkedResources?.meetings?.length) return [];
        return this.meetingsService.meetings().filter(m => p.linkedResources!.meetings!.includes(m.id));
    });

    linkedBooks = computed(() => {
        const p = this.project();
        if (!p?.linkedResources?.books?.length) return [];
        return this.booksService.books().filter(b => p.linkedResources!.books!.includes(b.id));
    });

    linkedResearch = computed(() => {
        const p = this.project();
        if (!p?.linkedResources?.research?.length) return [];
        return this.researchService.libraries().filter(lib => p.linkedResources!.research!.includes(lib.id));
    });

    linkedArticles = computed(() => {
        const p = this.project();
        if (!p?.linkedResources?.articles?.length) return [];
        return this.articleService.articles().filter(a => p.linkedResources!.articles!.includes(a.id));
    });

    hasLinkedResources = computed(() =>
        this.linkedNovels().length > 0 ||
        this.linkedNotes().length > 0 ||
        this.linkedMeetings().length > 0 ||
        this.linkedBooks().length > 0 ||
        this.linkedResearch().length > 0 ||
        this.linkedArticles().length > 0
    );

    constructor() {
        this.route.paramMap.pipe(
            map(params => params.get('id')),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(id => {
            this.projectId.set(id);
        });
    }

    goBack() {
        this.router.navigate(['/projects']);
    }

    startEdit() {
        const p = this.project();
        if (!p) return;
        this.editTitle.set(p.title);
        this.editDescription.set(p.description ?? '');
        this.editStatus.set(p.status);
        this.editMode.set(true);
    }

    saveEdit() {
        const id = this.projectId();
        if (!id) return;
        this.store.updateProject(id, {
            title: this.editTitle().trim() || this.project()!.title,
            description: this.editDescription(),
            status: this.editStatus(),
            updated: new Date().toISOString()
        });
        this.editMode.set(false);
    }

    cancelEdit() {
        this.editMode.set(false);
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
            due: new Date().toISOString().split('T')[0]
        });

        this.newTaskTitle.set('');
    }

    updateTaskStatus(taskId: string, status: 'ACTIVE' | 'PENDING' | 'COMPLETED') {
        this.store.updateTask(taskId, { status });
    }

    deleteTask(taskId: string) {
        this.store.deleteTask(taskId);
    }

    // Vault
    showAddCredential = signal(false);
    newCredName = signal('');
    newCredType = signal<'login' | 'api_key' | 'ssh' | 'db' | 'note'>('login');
    newCredValue = signal('');
    visibleCreds = signal<Set<string>>(new Set());

    projectCredentials = computed(() => {
        const id = this.projectId();
        return id ? this.vaultStore.getCredentialsByProject(id)() : [];
    });

    toggleCredVisibility(id: string) {
        const set = new Set(this.visibleCreds());
        if (set.has(id)) set.delete(id); else set.add(id);
        this.visibleCreds.set(set);
    }

    decryptCred(cipher: string): string {
        return EncryptionUtil.decrypt(cipher);
    }

    copyCred(cipher: string) {
        navigator.clipboard.writeText(this.decryptCred(cipher));
    }

    addCredential() {
        const id = this.projectId();
        if (!id || !this.newCredName() || !this.newCredValue()) return;
        this.vaultStore.addCredential({
            id: crypto.randomUUID(),
            name: this.newCredName(),
            type: this.newCredType(),
            projectId: id,
            createdAt: new Date().toISOString(),
            unencryptedValue: this.newCredValue()
        });
        this.newCredName.set('');
        this.newCredValue.set('');
        this.showAddCredential.set(false);
    }

    // Subscriptions
    showAddSubscription = signal(false);
    newSubName = signal('');
    newSubCategory = signal('');
    newSubPrice = signal(0);
    newSubCycle = signal<'monthly' | 'yearly'>('monthly');
    newSubRenewal = signal('');

    projectSubscriptions = computed(() => {
        const id = this.projectId();
        return id ? this.subscriptionStore.getSubscriptionsByProject(id)() : [];
    });

    addSubscription() {
        const id = this.projectId();
        if (!id || !this.newSubName() || !this.newSubRenewal()) return;
        this.subscriptionStore.addSubscription({
            id: crypto.randomUUID(),
            name: this.newSubName(),
            category: this.newSubCategory() || 'General',
            price: this.newSubPrice(),
            billingCycle: this.newSubCycle(),
            renewalDate: this.newSubRenewal(),
            projectId: id
        });
        this.showAddSubscription.set(false);
    }

    // Link modal
    showLinkModal = signal(false);
    linkTargetType = signal<'credential' | 'subscription'>('credential');
    activeItemForLink = signal<string | null>(null);
    selectedTargetToLink = signal('');

    openLinkModal(type: 'credential' | 'subscription', itemId: string) {
        this.linkTargetType.set(type);
        this.activeItemForLink.set(itemId);
        this.selectedTargetToLink.set('');
        this.showLinkModal.set(true);
    }

    addLink() {
        const sourceId = this.activeItemForLink();
        const targetId = this.selectedTargetToLink();
        if (!sourceId || !targetId) return;
        if (this.linkTargetType() === 'credential') {
            this.linkStore.linkCredentialToSubscription(sourceId, targetId);
        } else {
            this.linkStore.linkCredentialToSubscription(targetId, sourceId);
        }
        this.showLinkModal.set(false);
    }

    getLinkedItemsText(type: 'credential' | 'subscription', itemId: string): string {
        if (type === 'credential') {
            return this.linkStore.getLinksByCredential(itemId)().length + ' Subs';
        }
        return this.linkStore.getLinksBySubscription(itemId)().length + ' Creds';
    }
}
