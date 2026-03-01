import { __decorate } from "tslib";
import { Component, computed, inject, signal, HostListener, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BooksService, } from '@envello/core';
import { ButtonComponent, IconButtonComponent, EmptyStateComponent, ModalComponent, } from '@envello/ui';
let BooksComponent = class BooksComponent {
    booksService = inject(BooksService);
    showAddModal = signal(false);
    newBook = signal({
        title: '',
        author: '',
        category: 'PRODUCTIVITY',
        status: 'queued',
        progress: 0,
        notesCount: 0,
        notes: [],
    });
    showDetailModal = signal(false);
    editingBook = signal(false);
    editedBook = signal({});
    newNoteInput = signal('');
    newNotePage = signal(undefined);
    showQuickActions = signal(null);
    showShortcutsHelp = signal(false);
    filteredBooks = computed(() => this.booksService.filteredBooks());
    stats = computed(() => this.booksService.stats());
    booksByCategory = computed(() => this.booksService.booksByCategory());
    availableCategories = computed(() => this.booksService.availableCategories());
    selectedBook = computed(() => this.booksService.selectedBook());
    categories = ['DESIGN', 'CREATIVE', 'PRODUCTIVITY', 'OTHER'];
    ngOnInit() { }
    ngOnDestroy() { }
    onDocumentClick(event) {
        if (this.showQuickActions()) {
            const el = event.target;
            if (!el.closest('.row-actions'))
                this.showQuickActions.set(null);
        }
    }
    onKeyDown(e) {
        const inInput = e.target?.tagName === 'INPUT' ||
            e.target?.tagName === 'TEXTAREA';
        if (e.key === 'Escape') {
            if (this.showAddModal())
                this.closeAddModal();
            else if (this.showDetailModal())
                this.closeDetailModal();
            else if (this.showShortcutsHelp())
                this.showShortcutsHelp.set(false);
            else if (this.showQuickActions())
                this.showQuickActions.set(null);
            return;
        }
        if (inInput)
            return;
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            this.openAddModal();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.querySelector('.books-search-input')?.focus();
        }
    }
    openAddModal() {
        this.newBook.set({
            title: '',
            author: '',
            category: 'PRODUCTIVITY',
            status: 'queued',
            progress: 0,
            notesCount: 0,
            notes: [],
        });
        this.showAddModal.set(true);
    }
    closeAddModal() {
        this.showAddModal.set(false);
    }
    addBook() {
        const n = this.newBook();
        if (!n.title?.trim())
            return;
        const now = new Date().toISOString();
        this.booksService.addBook({
            title: n.title.trim(),
            author: (n.author ?? '').trim(),
            category: n.category ?? 'OTHER',
            status: n.status ?? 'queued',
            progress: n.progress ?? 0,
            notesCount: 0,
            lastAccessed: now,
            notes: [],
        });
        this.closeAddModal();
    }
    openDetailModal(book) {
        this.booksService.selectedBookId.set(book.id);
        this.booksService.touchLastAccessed(book.id);
        this.editedBook.set({ ...book });
        this.editingBook.set(false);
        this.newNoteInput.set('');
        this.newNotePage.set(undefined);
        this.showDetailModal.set(true);
    }
    closeDetailModal() {
        this.showDetailModal.set(false);
        this.booksService.selectedBookId.set(null);
        this.editingBook.set(false);
    }
    startEditing() {
        const b = this.selectedBook();
        if (b) {
            this.editedBook.set({ ...b });
            this.editingBook.set(true);
        }
    }
    cancelEditing() {
        const b = this.selectedBook();
        if (b)
            this.editedBook.set({ ...b });
        this.editingBook.set(false);
    }
    saveEditing() {
        const b = this.selectedBook();
        const patch = this.editedBook();
        if (b && patch) {
            this.booksService.updateBook(b.id, patch);
            const updated = this.booksService.books().find(x => x.id === b.id);
            if (updated)
                this.booksService.selectedBookId.set(updated.id);
        }
        this.editingBook.set(false);
    }
    deleteBook(book) {
        if (confirm(`Delete "${book.title}"?`)) {
            this.booksService.deleteBook(book.id);
            this.closeDetailModal();
        }
    }
    setStatus(book, status) {
        this.booksService.setStatus(book.id, status);
        const updated = this.booksService.books().find(x => x.id === book.id);
        if (updated)
            this.booksService.selectedBookId.set(updated.id);
    }
    addNote() {
        const b = this.selectedBook();
        const content = this.newNoteInput().trim();
        if (!b || !content)
            return;
        this.booksService.addNote(b.id, content, this.newNotePage());
        this.newNoteInput.set('');
        this.newNotePage.set(undefined);
        const updated = this.booksService.books().find(x => x.id === b.id);
        if (updated)
            this.booksService.selectedBookId.set(updated.id);
    }
    removeNote(bookId, noteId) {
        this.booksService.deleteNote(bookId, noteId);
        const b = this.selectedBook();
        if (b) {
            const updated = this.booksService.books().find(x => x.id === b.id);
            if (updated)
                this.booksService.selectedBookId.set(updated.id);
        }
    }
    toggleQuickActions(bookId, ev) {
        ev.stopPropagation();
        this.showQuickActions.update(v => (v === bookId ? null : bookId));
    }
    getCategoryColor(cat) {
        switch (cat) {
            case 'DESIGN': return '#3b82f6';
            case 'CREATIVE': return '#a855f7';
            case 'PRODUCTIVITY': return '#f97316';
            default: return '#71717a';
        }
    }
    getStatusIcon(status) {
        switch (status) {
            case 'reading': return 'menu_book';
            case 'completed': return 'check_circle';
            case 'queued': return 'pending';
            default: return 'book';
        }
    }
    formatDate(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    formatShortDate(iso) {
        const d = new Date(iso);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diff = Math.round((today.getTime() - day.getTime()) / 864e5);
        if (diff === 0)
            return 'Today';
        if (diff === 1)
            return 'Yesterday';
        if (diff < 7)
            return d.toLocaleDateString('en-US', { weekday: 'short' });
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    updateNewBook(key, value) {
        this.newBook.update(n => ({ ...n, [key]: value }));
    }
    updateEditedBook(key, value) {
        this.editedBook.update(e => ({ ...e, [key]: value }));
    }
    openShortcutsHelp() {
        this.showShortcutsHelp.set(true);
    }
    closeShortcutsHelp() {
        this.showShortcutsHelp.set(false);
    }
};
__decorate([
    HostListener('document:click', ['$event'])
], BooksComponent.prototype, "onDocumentClick", null);
__decorate([
    HostListener('document:keydown', ['$event'])
], BooksComponent.prototype, "onKeyDown", null);
BooksComponent = __decorate([
    Component({
        selector: 'app-books',
        standalone: true,
        imports: [
            CommonModule,
            FormsModule,
            ButtonComponent,
            IconButtonComponent,
            EmptyStateComponent,
            ModalComponent,
        ],
        templateUrl: './books.component.html',
        styleUrl: './books.component.css',
    })
], BooksComponent);
export { BooksComponent };
