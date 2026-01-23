import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface AddNewOption {
    id: string;
    title: string;
    description: string;
    icon: string;
    route: string;
    color: string;
    count?: number;
    shortcut?: string;
}

@Component({
    selector: 'app-add-new-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './add-new-modal.component.html',
    styleUrl: './add-new-modal.component.css'
})
export class AddNewModalComponent {
    isOpen = signal<boolean>(false);

    options: AddNewOption[] = [
        {
            id: 'note',
            title: 'Daily Note',
            description: 'Quick note or journal entry',
            icon: 'description',
            route: '/daily-notes',
            color: '#e8a87c'
        },
        {
            id: 'task',
            title: 'Task',
            description: 'Add a new task or to-do',
            icon: 'check_circle',
            route: '/tasks',
            color: '#7eb3d4'
        },
        {
            id: 'novel',
            title: 'Novel Chapter',
            description: 'Start writing a new chapter',
            icon: 'menu_book',
            route: '/novels',
            color: '#c4a8d8'
        },
        {
            id: 'article',
            title: 'Article/Blog',
            description: 'Write a new article or blog post',
            icon: 'article',
            route: '/articles',
            color: '#a8d5a8'
        },
        {
            id: 'journal',
            title: 'Journal Entry',
            description: 'Personal journal or reflection',
            icon: 'auto_stories',
            route: '/journals',
            color: '#f0b8d0'
        },
        {
            id: 'research',
            title: 'Research Note',
            description: 'Document research findings',
            icon: 'science',
            route: '/research',
            color: '#f4e89c'
        },
        {
            id: 'meeting',
            title: 'Meeting Notes',
            description: 'Record meeting discussions',
            icon: 'groups',
            route: '/meetings',
            color: '#d89090'
        },
        {
            id: 'snippet',
            title: 'Code Snippet',
            description: 'Save a code snippet',
            icon: 'code',
            route: '/snippets',
            color: '#b8d8e8'
        }
    ];

    constructor(private router: Router) { }

    open() {
        this.isOpen.set(true);
    }

    close() {
        this.isOpen.set(false);
    }

    selectOption(option: AddNewOption) {
        this.router.navigate([option.route]);
        this.close();
    }

    onBackdropClick() {
        this.close();
    }

    onModalClick(event: Event) {
        event.stopPropagation();
    }

    @HostListener('document:keydown.escape', ['$event'])
    handleEscape(event: KeyboardEvent) {
        if (this.isOpen()) {
            event.preventDefault();
            this.close();
        }
    }
}
