import { __decorate } from "tslib";
import { Component, inject, signal, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '@envello/core';
let QuickFindComponent = class QuickFindComponent {
    store = inject(StoreService);
    router = inject(Router);
    isOpen = signal(false);
    searchQuery = signal('');
    selectedIndex = signal(0);
    results = signal([]);
    constructor() {
        // Watch for search query changes
        effect(() => {
            const query = this.searchQuery();
            if (query.length > 0) {
                this.performSearch(query);
            }
            else {
                this.showRecentItems();
            }
        });
    }
    handleKeyboardShortcut(event) {
        // Cmd+K or Ctrl+K to open
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault();
            this.open();
        }
        // Escape to close
        if (event.key === 'Escape' && this.isOpen()) {
            this.close();
        }
        // Arrow navigation
        if (this.isOpen()) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.selectedIndex.update(i => Math.min(i + 1, this.results().length - 1));
            }
            else if (event.key === 'ArrowUp') {
                event.preventDefault();
                this.selectedIndex.update(i => Math.max(i - 1, 0));
            }
            else if (event.key === 'Enter') {
                event.preventDefault();
                this.selectResult(this.results()[this.selectedIndex()]);
            }
        }
    }
    open() {
        this.isOpen.set(true);
        this.searchQuery.set('');
        this.selectedIndex.set(0);
        this.showRecentItems();
        // Focus input after a brief delay
        setTimeout(() => {
            const input = document.querySelector('.quick-find-input');
            input?.focus();
        }, 100);
    }
    close() {
        this.isOpen.set(false);
        this.searchQuery.set('');
    }
    performSearch(query) {
        const lowerQuery = query.toLowerCase();
        const allResults = [];
        // Search notes
        const notes = this.store.notes();
        notes.forEach((note) => {
            if (note.title.toLowerCase().includes(lowerQuery) ||
                note.preview.toLowerCase().includes(lowerQuery) ||
                note.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
                allResults.push({
                    id: note.id,
                    type: 'note',
                    title: note.title,
                    preview: note.preview,
                    icon: 'description',
                    route: '/daily-notes',
                    date: note.date,
                    tags: note.tags
                });
            }
        });
        // Search tasks
        const tasks = this.store.tasks();
        tasks.forEach((task) => {
            if (task.title.toLowerCase().includes(lowerQuery) ||
                task.project?.toLowerCase().includes(lowerQuery)) {
                allResults.push({
                    id: task.id,
                    type: 'task',
                    title: task.title,
                    preview: task.project || '',
                    icon: 'check_circle',
                    route: '/tasks',
                    date: task.due
                });
            }
        });
        // Limit to top 10 results
        this.results.set(allResults.slice(0, 10));
        this.selectedIndex.set(0);
    }
    showRecentItems() {
        const recentResults = [];
        // Show recent notes
        const notes = this.store.notes().slice(0, 5);
        notes.forEach((note) => {
            recentResults.push({
                id: note.id,
                type: 'note',
                title: note.title,
                preview: note.preview,
                icon: 'description',
                route: '/daily-notes',
                date: note.date,
                tags: note.tags
            });
        });
        this.results.set(recentResults);
    }
    selectResult(result) {
        if (!result)
            return;
        this.router.navigate([result.route]);
        this.close();
    }
    onBackdropClick() {
        this.close();
    }
    onModalClick(event) {
        event.stopPropagation();
    }
};
__decorate([
    HostListener('document:keydown', ['$event'])
], QuickFindComponent.prototype, "handleKeyboardShortcut", null);
QuickFindComponent = __decorate([
    Component({
        selector: 'app-quick-find',
        standalone: true,
        imports: [CommonModule, FormsModule],
        templateUrl: './quick-find.component.html',
        styleUrl: './quick-find.component.css'
    })
], QuickFindComponent);
export { QuickFindComponent };
