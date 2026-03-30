import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ShortcutGroup {
  label: string;
  shortcuts: { keys: string[]; description: string }[];
}

@Component({
  selector: 'app-keyboard-shortcuts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyboard-shortcuts.component.html',
  styleUrl: './keyboard-shortcuts.component.css',
})
export class KeyboardShortcutsComponent {
  isOpen = signal(false);

  groups: ShortcutGroup[] = [
    {
      label: 'Navigation',
      shortcuts: [
        { keys: ['⌘', 'K'], description: 'Open Quick Find' },
        { keys: ['⌘', 'N'], description: 'Add New item' },
        { keys: ['?'],       description: 'Show keyboard shortcuts' },
        { keys: ['Esc'],     description: 'Close modal / Exit focus mode' },
      ],
    },
    {
      label: 'Editor',
      shortcuts: [
        { keys: ['⌘', 'S'],     description: 'Save / sync' },
        { keys: ['⌘', 'Z'],     description: 'Undo' },
        { keys: ['⌘', 'B'],     description: 'Bold' },
        { keys: ['⌘', 'I'],     description: 'Italic' },
        { keys: ['⌘', '⇧', 'K'], description: 'Insert link' },
      ],
    },
    {
      label: 'Tasks',
      shortcuts: [
        { keys: ['1'], description: 'List view' },
        { keys: ['2'], description: 'Board view' },
        { keys: ['3'], description: 'Calendar view' },
        { keys: ['4'], description: 'Timeline view' },
        { keys: ['5'], description: 'Thumbnails view' },
      ],
    },
  ];

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent) {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || (event.target as HTMLElement)?.isContentEditable;

    if (event.key === '?' && !isInput) {
      event.preventDefault();
      this.toggle();
    }

    if (event.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  }

  toggle() { this.isOpen.update(v => !v); }
  open()   { this.isOpen.set(true); }
  close()  { this.isOpen.set(false); }
}
