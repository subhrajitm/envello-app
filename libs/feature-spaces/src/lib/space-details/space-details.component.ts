import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import {
    StoreService, Project, MeetingsService,
    ResearchService, ArticleService, EncryptionUtil, WorkspaceProfileService
} from '@envello/core';
import { VaultStore, SubscriptionStore, LinkStore } from '@envello/state';

export type SectionType = 'notes' | 'meetings' | 'bookmarks' | 'novels' | 'articles' | 'research';

@Component({
    selector: 'app-space-details',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './space-details.component.html',
    styleUrl: './space-details.component.css'
})
export class SpaceDetailsComponent {
    private route = inject(ActivatedRoute);
    public store = inject(StoreService);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    private meetingsService = inject(MeetingsService);
    private researchService = inject(ResearchService);
    private articleService = inject(ArticleService);

    public vaultStore = inject(VaultStore);
    public subscriptionStore = inject(SubscriptionStore);
    public linkStore = inject(LinkStore);
    public workspaceService = inject(WorkspaceProfileService);

    activeTab = signal<'OVERVIEW' | 'VAULT' | 'SUBSCRIPTIONS'>('OVERVIEW');
    projectId = signal<string | null>(null);
    newTaskTitle = signal('');

    // Edit mode
    editMode = signal(false);
    editTitle = signal('');
    editDescription = signal('');
    editStatus = signal<Project['status']>('PLANNING');

    // Link-item modal
    linkSectionType = signal<SectionType | null>(null);
    linkSearch = signal('');

    // ── Core project ──────────────────────────────────────────────────────────
    project = computed(() => {
        const id = this.spaceId();
        if (!id) return null;
        return this.store.spaces().find(p => p.id === id) || null;
    });

    // ── Tasks ─────────────────────────────────────────────────────────────────
    projectTasks = computed(() => {
        const p = this.space();
        if (!p) return [];
        return this.store.tasks().filter(t => t.space === p.id);
    });
    activeTasks    = computed(() => this.spaceTasks().filter(t => t.status === 'ACTIVE'));
    pendingTasks   = computed(() => this.spaceTasks().filter(t => t.status === 'PENDING'));
    completedTasks = computed(() => this.spaceTasks().filter(t => t.status === 'COMPLETED'));

    // ── Linked resources ──────────────────────────────────────────────────────
    private linkedIds = (key: keyof NonNullable<Project['linkedResources']>) =>
        computed(() => this.space()?.linkedResources?.[key] ?? []);

    private linkedNovelsIds   = this.linkedIds('novels');
    private linkedNotesIds    = this.linkedIds('notes');
    private linkedMeetingsIds = this.linkedIds('meetings');
    private linkedResearchIds = this.linkedIds('research');
    private linkedArticlesIds = this.linkedIds('articles');
    private linkedBookmarkIds = this.linkedIds('bookmarks');

    linkedNovels   = computed(() => this.store.novels().filter(n => (this.linkedNovelsIds() as string[]).includes(n.id)));
    linkedNotes    = computed(() => this.store.notes().filter(n => (this.linkedNotesIds() as string[]).includes(n.id)));
    linkedMeetings = computed(() => this.meetingsService.meetings().filter(m => (this.linkedMeetingsIds() as string[]).includes(m.id)));
    linkedResearch = computed(() => this.researchService.libraries().filter(l => (this.linkedResearchIds() as string[]).includes(l.id)));
    linkedArticles = computed(() => this.articleService.articles().filter(a => (this.linkedArticlesIds() as string[]).includes(a.id)));
    linkedBookmarks = computed(() => this.store.bookmarks().filter(b => (this.linkedBookmarkIds() as string[]).includes(b.id)));

    // ── Linkable items (all minus already-linked) ──────────────────────────────
    linkableItems = computed(() => {
        const type = this.linkSectionType();
        const q = this.linkSearch().toLowerCase();
        if (!type) return [];

        const linkedIds: string[] = (this.space()?.linkedResources?.[type] ?? []) as string[];

        const filter = <T extends { id: string; title?: string; name?: string }>(
            items: T[], label: keyof T = 'title'
        ) => items
            .filter(i => !linkedIds.includes(i.id))
            .filter(i => !q || String(i[label] ?? '').toLowerCase().includes(q));

        switch (type) {
            case 'notes':     return filter(this.store.notes());
            case 'meetings':  return filter(this.meetingsService.meetings());
            case 'bookmarks': return filter(this.store.bookmarks());
            case 'novels':    return filter(this.store.novels());
            case 'articles':  return filter(this.articleService.articles());
            case 'research':  return filter(this.researchService.libraries(), 'name');
            default: return [];
        }
    });

    constructor() {
        this.route.paramMap.pipe(
            map(params => params.get('id')),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(id => this.spaceId.set(id));
    }

    // ── Navigation & edit ─────────────────────────────────────────────────────
    goBack() { this.router.navigate(['/projects']); }

    startEdit() {
        const p = this.space();
        if (!p) return;
        this.editTitle.set(p.title);
        this.editDescription.set(p.description ?? '');
        this.editStatus.set(p.status);
        this.editMode.set(true);
    }

    saveEdit() {
        const id = this.spaceId();
        if (!id) return;
        const newTitle = this.editTitle().trim() || this.space()!.title;
        this.store.updateProject(id, {
            title: newTitle,
            description: this.editDescription(),
            status: this.editStatus(),
            updated: new Date().toISOString()
        });
        this.workspaceService.updateProfile(id, { name: newTitle });
        this.editMode.set(false);
    }

    cancelEdit() { this.editMode.set(false); }

    switchToProject() {
        const id = this.spaceId();
        if (id) this.workspaceService.switchProfile(id);
    }

    isActiveProject() {
        return this.workspaceService.activeProfileId() === this.spaceId();
    }

    // ── Tasks ─────────────────────────────────────────────────────────────────
    addTask() {
        const title = this.newTaskTitle().trim();
        const p = this.space();
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

    deleteTask(taskId: string) { this.store.deleteTask(taskId); }

    // ── Link / Unlink resources ───────────────────────────────────────────────
    openLinkSection(type: SectionType) {
        this.linkSectionType.set(type);
        this.linkSearch.set('');
    }

    closeLinkSection() { this.linkSectionType.set(null); }

    linkItem(itemId: string) {
        const type = this.linkSectionType();
        const p = this.space();
        if (!type || !p) return;
        const current: string[] = [...((p.linkedResources?.[type] ?? []) as string[])];
        if (current.includes(itemId)) return;
        this.store.updateProject(p.id, {
            linkedResources: { ...p.linkedResources, [type]: [...current, itemId] }
        });
    }

    unlinkItem(type: SectionType, itemId: string) {
        const p = this.space();
        if (!p) return;
        const current: string[] = [...((p.linkedResources?.[type] ?? []) as string[])];
        this.store.updateProject(p.id, {
            linkedResources: { ...p.linkedResources, [type]: current.filter(id => id !== itemId) }
        });
    }

    getItemLabel(item: Record<string, unknown>): string {
        return String(item['title'] ?? item['name'] ?? '');
    }

    getItemSub(type: SectionType, item: Record<string, unknown>): string {
        switch (type) {
            case 'notes':     return String(item['date'] ?? '');
            case 'meetings':  return String(item['date'] ?? '');
            case 'bookmarks': return String(item['url'] ?? '');
            case 'novels':    return String(item['genre'] ? (item['genre'] as string[]).join(', ') : '');
            case 'articles':  return String(item['platform'] ?? '');
            case 'research':  return String(item['description'] ?? '');
            default:          return '';
        }
    }

    // ── Vault ─────────────────────────────────────────────────────────────────
    showAddCredential = signal(false);
    newCredName  = signal('');
    newCredType  = signal<'login' | 'api_key' | 'ssh' | 'db' | 'note'>('login');
    newCredValue = signal('');
    visibleCreds = signal<Set<string>>(new Set());

    projectCredentials = computed(() => {
        const id = this.spaceId();
        return id ? this.vaultStore.getCredentialsByProject(id)() : [];
    });

    toggleCredVisibility(id: string) {
        const set = new Set(this.visibleCreds());
        if (set.has(id)) set.delete(id); else set.add(id);
        this.visibleCreds.set(set);
    }

    decryptCred(cipher: string) { return EncryptionUtil.decrypt(cipher); }
    copyCred(cipher: string) { navigator.clipboard.writeText(this.decryptCred(cipher)); }

    addCredential() {
        const id = this.spaceId();
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

    // ── Subscriptions ─────────────────────────────────────────────────────────
    showAddSubscription = signal(false);
    newSubName     = signal('');
    newSubCategory = signal('');
    newSubPrice    = signal(0);
    newSubCycle    = signal<'monthly' | 'yearly'>('monthly');
    newSubRenewal  = signal('');

    projectSubscriptions = computed(() => {
        const id = this.spaceId();
        return id ? this.subscriptionStore.getSubscriptionsByProject(id)() : [];
    });

    addSubscription() {
        const id = this.spaceId();
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

    // ── Vault-Subscription links ───────────────────────────────────────────────
    showLinkModal        = signal(false);
    linkTargetType       = signal<'credential' | 'subscription'>('credential');
    activeItemForLink    = signal<string | null>(null);
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
        if (type === 'credential') return this.linkStore.getLinksByCredential(itemId)().length + ' Subs';
        return this.linkStore.getLinksBySubscription(itemId)().length + ' Creds';
    }
}
