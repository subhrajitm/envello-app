import { Component, signal, HostListener, inject, computed, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalComponent } from '../../shared/ui';
import { StoreService, Task, Note, Novel } from '../../services/store.service';
import { ArticleService } from '../../services/article.service';
import { JournalService } from '../../services/journal.service';
import { ResearchService } from '../../services/research.service';
import { MeetingsService, MEETING_COLORS } from '../../services/meetings.service';
import { SnippetsService } from '../../services/snippets.service';
import { NovelContentService } from '../../services/novel-content.service';

type OptionCategory = 'writing' | 'productivity' | 'organization';
type SidebarCategoryId = 'all' | 'recent' | OptionCategory;

interface AddNewOption {
    id: string;
    title: string;
    description: string;
    icon: string;
    route: string;
    color: string;
    category: OptionCategory;
    shortcut: string;
    keywords: string[];
    tag: string; // e.g. NOTE, TASK, PROJECT
}

interface RecentItem {
    optionId: string;
    timestamp: number;
}

const RECENT_STORAGE_KEY = 'envello-add-new-recent';
const MAX_RECENT_ITEMS = 4;

@Component({
    selector: 'app-add-new-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent],
    templateUrl: './add-new-modal.component.html',
    styleUrl: './add-new-modal.component.css'
})
export class AddNewModalComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
    @ViewChild('optionsContainer') optionsContainer!: ElementRef<HTMLDivElement>;

    private router = inject(Router);
    private store = inject(StoreService);
    private articleService = inject(ArticleService);
    private journalService = inject(JournalService);
    private researchService = inject(ResearchService);
    private meetingsService = inject(MeetingsService);
    private snippetsService = inject(SnippetsService);
    private novelContentService = inject(NovelContentService);

    isOpen = signal(false);
    searchQuery = signal('');
    isCreating = signal(false);
    createdItem = signal<string | null>(null);
    focusedIndex = signal(0);
    recentOptionIds = signal<string[]>([]);
    selectedCategoryId = signal<SidebarCategoryId>('all');

    readonly categories: { id: OptionCategory; label: string; icon: string }[] = [
        { id: 'writing', label: 'Writing', icon: 'edit_note' },
        { id: 'productivity', label: 'Productivity', icon: 'task_alt' },
        { id: 'organization', label: 'Organization', icon: 'folder_open' }
    ];

    readonly options: AddNewOption[] = [
        { id: 'note', title: 'Daily Note', description: 'Quick note or journal entry', icon: 'description', route: '/daily-notes', color: '#e8a87c', category: 'writing', shortcut: '1', keywords: ['note', 'daily', 'journal'], tag: 'NOTE' },
        { id: 'task', title: 'Task', description: 'Add a new task or to-do', icon: 'check_circle', route: '/tasks', color: '#7eb3d4', category: 'productivity', shortcut: '2', keywords: ['task', 'todo', 'checklist'], tag: 'TASK' },
        { id: 'novel', title: 'Novel', description: 'Start a new writing project', icon: 'menu_book', route: '/novels', color: '#c4a8d8', category: 'writing', shortcut: '3', keywords: ['novel', 'book', 'story'], tag: 'PROJECT' },
        { id: 'article', title: 'Article', description: 'Write a new article or blog post', icon: 'article', route: '/articles', color: '#a8d5a8', category: 'writing', shortcut: '4', keywords: ['article', 'blog', 'post'], tag: 'DOCS' },
        { id: 'journal', title: 'Journal Project', description: 'Create a new journal project', icon: 'auto_stories', route: '/journals', color: '#f0b8d0', category: 'writing', shortcut: '5', keywords: ['journal', 'project'], tag: 'PROJECT' },
        { id: 'research', title: 'Research Library', description: 'Create a new research library', icon: 'science', route: '/research', color: '#f4e89c', category: 'organization', shortcut: '6', keywords: ['research', 'library'], tag: 'RESEARCH' },
        { id: 'meeting', title: 'Meeting', description: 'Schedule a new meeting', icon: 'groups', route: '/meetings', color: '#d89090', category: 'productivity', shortcut: '7', keywords: ['meeting', 'schedule'], tag: 'COLLAB' },
        { id: 'snippet', title: 'Code Snippet', description: 'Save a code snippet', icon: 'code', route: '/snippets', color: '#b8d8e8', category: 'organization', shortcut: '8', keywords: ['code', 'snippet'], tag: 'DEV' }
    ];

    readonly sidebarCategories: { id: SidebarCategoryId; label: string; icon: string }[] = [
        { id: 'all', label: 'All Templates', icon: 'grid_view' },
        { id: 'recent', label: 'Recent', icon: 'history' },
        { id: 'writing', label: 'Writing', icon: 'edit_note' },
        { id: 'productivity', label: 'Productivity', icon: 'task_alt' },
        { id: 'organization', label: 'Organization', icon: 'folder_open' }
    ];

    // Computed: item counts for each type
    readonly itemCounts = computed(() => ({
        note: this.store.notes().length,
        task: this.store.tasks().length,
        novel: this.store.novels().length,
        article: this.articleService.articles().length,
        journal: this.journalService.projects().length,
        research: this.researchService.libraries().length,
        meeting: this.meetingsService.meetings().length,
        snippet: this.snippetsService.snippets().length
    }));

    // Computed: filtered options based on search
    readonly filteredOptions = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        if (!query) return this.options;

        return this.options.filter(opt =>
            opt.title.toLowerCase().includes(query) ||
            opt.description.toLowerCase().includes(query) ||
            opt.keywords.some(kw => kw.includes(query))
        );
    });

    // Options shown in right pane based on selected category and search
    readonly rightPaneOptions = computed(() => {
        const filtered = this.filteredOptions();
        const query = this.searchQuery().trim();
        const selected = this.selectedCategoryId();
        const recentIds = this.recentOptionIds();

        if (query) {
            return [{ label: 'Search Results', options: filtered }];
        }

        if (selected === 'all') {
            const recentOptions = recentIds.map(id => this.options.find(o => o.id === id)).filter((o): o is AddNewOption => !!o);
            const recentIdSet = new Set(recentIds);
            const otherOptions = filtered.filter(o => !recentIdSet.has(o.id));
            const groups: { label: string; options: AddNewOption[] }[] = [];
            if (recentOptions.length > 0) groups.push({ label: 'Recent', options: recentOptions });
            if (otherOptions.length > 0) groups.push({ label: 'Templates', options: otherOptions });
            return groups.length > 0 ? groups : [{ label: 'Templates', options: filtered }];
        }

        if (selected === 'recent') {
            const recentOptions = recentIds.map(id => this.options.find(o => o.id === id)).filter((o): o is AddNewOption => !!o);
            return recentOptions.length > 0 ? [{ label: 'Recent', options: recentOptions }] : [{ label: 'Recent', options: [] }];
        }

        const categoryOptions = filtered.filter(o => o.category === selected);
        const label = this.categories.find(c => c.id === selected)?.label ?? 'Templates';
        return [{ label, options: categoryOptions }];
    });

    readonly flatVisibleOptions = computed(() => {
        return this.rightPaneOptions().flatMap(g => g.options);
    });

    readonly visibleSidebarCategories = computed(() => {
        const recentIds = this.recentOptionIds();
        return this.sidebarCategories.filter(c => c.id !== 'recent' || recentIds.length > 0);
    });

    ngOnInit() {
        this.loadRecentItems();
    }

    ngAfterViewInit() {
        // Focus search input when modal opens
    }

    ngOnDestroy() {
        // Cleanup if needed
    }

    private loadRecentItems() {
        try {
            const stored = localStorage.getItem(RECENT_STORAGE_KEY);
            if (stored) {
                const items: RecentItem[] = JSON.parse(stored);
                // Sort by timestamp descending and get unique option IDs
                const sortedIds = items
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, MAX_RECENT_ITEMS)
                    .map(i => i.optionId);
                this.recentOptionIds.set(sortedIds);
            }
        } catch (e) {
            console.error('Failed to load recent items', e);
        }
    }

    private saveRecentItem(optionId: string) {
        try {
            const stored = localStorage.getItem(RECENT_STORAGE_KEY);
            let items: RecentItem[] = stored ? JSON.parse(stored) : [];

            // Remove existing entry for this option
            items = items.filter(i => i.optionId !== optionId);

            // Add new entry at the beginning
            items.unshift({ optionId, timestamp: Date.now() });

            // Keep only the most recent
            items = items.slice(0, MAX_RECENT_ITEMS * 2); // Keep more for persistence

            localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));

            // Update signal
            const recentIds = items.slice(0, MAX_RECENT_ITEMS).map(i => i.optionId);
            this.recentOptionIds.set(recentIds);
        } catch (e) {
            console.error('Failed to save recent item', e);
        }
    }

    open() {
        this.isOpen.set(true);
        this.searchQuery.set('');
        this.focusedIndex.set(0);
        this.createdItem.set(null);
        this.selectedCategoryId.set('all');

        setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
    }

    selectCategory(id: SidebarCategoryId) {
        this.selectedCategoryId.set(id);
        this.focusedIndex.set(0);
    }

    close() {
        if (this.isCreating()) return; // Don't close while creating
        this.isOpen.set(false);
        this.searchQuery.set('');
        this.createdItem.set(null);
    }

    onSearchChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchQuery.set(value);
        this.focusedIndex.set(0);
    }

    clearSearch() {
        this.searchQuery.set('');
        this.focusedIndex.set(0);
        this.searchInput?.nativeElement?.focus();
    }

    async selectOption(option: AddNewOption) {
        if (this.isCreating()) return;

        this.isCreating.set(true);
        this.saveRecentItem(option.id);

        // Show success feedback immediately
        this.createdItem.set(option.title);

        // Small delay for visual feedback, then navigate
        setTimeout(async () => {
            try {
                switch (option.id) {
                    case 'note':
                        this.createDailyNote();
                        break;
                    case 'task':
                        this.createTask();
                        break;
                    case 'novel':
                        this.createNovel();
                        break;
                    case 'article':
                        this.createArticle();
                        break;
                    case 'journal':
                        this.createJournalProject();
                        break;
                    case 'research':
                        this.createResearchLibrary();
                        break;
                    case 'meeting':
                        this.createMeeting();
                        break;
                    case 'snippet':
                        this.createSnippet();
                        break;
                    default:
                        this.router.navigate([option.route]);
                }
            } catch (error) {
                console.error('Failed to create item:', error);
            } finally {
                this.isCreating.set(false);
                this.isOpen.set(false);
                this.searchQuery.set('');
                this.createdItem.set(null);
            }
        }, 200);
    }

    selectFocusedOption() {
        const options = this.flatVisibleOptions();
        const index = this.focusedIndex();
        if (index >= 0 && index < options.length) {
            this.selectOption(options[index]);
        }
    }

    private createDailyNote() {
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const newNote: Note = {
            id: `note-${Date.now()}`,
            date: dateStr,
            title: `Note - ${dateStr}`,
            preview: 'Start writing...',
            content: '',
            tags: [],
            lastEdited: timeStr
        };

        this.store.addNote(newNote);
        this.router.navigate(['/daily-notes']);
    }

    private createTask() {
        const newTask: Task = {
            id: `task-${Date.now()}`,
            title: 'New Task',
            priority: 'MEDIUM',
            hours: '1.0H',
            status: 'ACTIVE'
        };

        this.store.addTask(newTask);
        this.router.navigate(['/tasks']);
    }

    private createNovel() {
        const id = `novel-${Date.now()}`;
        const newNovel: Novel = {
            id,
            title: 'Untitled Novel',
            icon: '📖',
            status: 'PLANNING',
            wordCount: 0,
            targetWordCount: 50000,
            progress: 0,
            chapters: 0,
            notesCount: 0,
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            genre: [],
            isRecentlyUpdated: true
        };

        this.store.addNovel(newNovel);
        // Persist asynchronously (fire and forget)
        this.novelContentService.createAndPersistEmptyNovel(id, newNovel.title).catch(err =>
            console.error('[AddNewModal] Failed to persist novel content:', err)
        );
        this.router.navigate(['/novels', id]);
    }

    private createArticle() {
        this.articleService.addArticle({
            title: 'Untitled Article',
            platform: 'Blog',
            pipeline: 'DRAFT',
            wordCount: 0,
            content: '',
            tags: [],
            icon: 'article'
        });

        this.router.navigate(['/articles']);
    }

    private createJournalProject() {
        this.journalService.addProject({
            title: 'New Journal Project',
            description: '',
            active: true
        });

        this.router.navigate(['/journals']);
    }

    private createResearchLibrary() {
        this.researchService.addLibrary({
            name: 'New Research Library',
            description: '',
            color: '#3b82f6'
        });

        this.router.navigate(['/research']);
    }

    private createMeeting() {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const hours = today.getHours();
        const nextHour = (hours + 1) % 24;
        const startTime = `${nextHour.toString().padStart(2, '0')}:00`;
        const endTime = `${((nextHour + 1) % 24).toString().padStart(2, '0')}:00`;

        this.meetingsService.addMeeting({
            title: 'New Meeting',
            date: dateStr,
            startTime,
            endTime,
            duration: 60,
            meetingType: 'video',
            attendees: [],
            status: 'scheduled',
            color: MEETING_COLORS[0]
        });

        this.router.navigate(['/meetings']);
    }

    private createSnippet() {
        this.snippetsService.addSnippet({
            title: 'New Snippet',
            lang: 'JavaScript',
            tags: [],
            content: '// Your code here',
            filename: 'snippet.js',
            path: '/snippets',
            creator: 'User'
        });

        this.router.navigate(['/snippets']);
    }

    getOptionCount(optionId: string): number {
        const counts = this.itemCounts();
        return counts[optionId as keyof typeof counts] ?? 0;
    }

    isOptionFocused(option: AddNewOption): boolean {
        const options = this.flatVisibleOptions();
        return options[this.focusedIndex()]?.id === option.id;
    }



    // Keyboard navigation
    @HostListener('document:keydown', ['$event'])
    handleKeydown(event: Event) {
        const e = event as KeyboardEvent;
        // Global shortcut: Cmd/Ctrl + N to open
        if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !this.isOpen()) {
            e.preventDefault();
            this.open();
            return;
        }

        if (!this.isOpen()) return;

        const options = this.flatVisibleOptions();
        const currentIndex = this.focusedIndex();

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.close();
                break;

            case 'ArrowDown':
                e.preventDefault();
                this.focusedIndex.set(Math.min(currentIndex + 1, options.length - 1));
                this.scrollToFocused();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.focusedIndex.set(Math.max(currentIndex - 1, 0));
                this.scrollToFocused();
                break;

            case 'Enter':
                e.preventDefault();
                this.selectFocusedOption();
                break;

            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    this.focusedIndex.set(Math.max(currentIndex - 1, 0));
                } else {
                    this.focusedIndex.set(Math.min(currentIndex + 1, options.length - 1));
                }
                this.scrollToFocused();
                break;

            // Number shortcuts (1-8)
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
                // Only trigger if not typing in search
                if (document.activeElement === this.searchInput?.nativeElement && this.searchQuery()) {
                    return;
                }
                const option = this.options.find(o => o.shortcut === e.key);
                if (option) {
                    e.preventDefault();
                    this.selectOption(option);
                }
                break;
        }
    }

    private scrollToFocused() {
        setTimeout(() => {
            const focused = this.optionsContainer?.nativeElement?.querySelector('.option-card--focused');
            focused?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 0);
    }

    trackByOptionId(index: number, option: AddNewOption): string {
        return option.id;
    }

    trackByGroupLabel(index: number, group: { label: string }): string {
        return group.label;
    }
}
