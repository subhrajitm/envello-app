import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-novel-editor',
  standalone: true,
  imports: [CommonModule, TiptapEditorDirective, FormsModule],
  templateUrl: './novel-editor.component.html',
  styleUrl: './novel-editor.component.css'
})
export class NovelEditorComponent implements OnInit, OnDestroy {
  editor!: Editor;

  // State
  title = signal('Emerald Protocol');
  activeChapterId = signal('c2');
  wordCount = signal(2405);
  rightSidebarTab = signal<'ai' | 'notes' | 'manuscript'>('ai');

  // Mock Data
  chapters = [
    {
      id: 'g1', title: 'Part I: The Awakening', expanded: true, children: [
        { id: 'c1', title: 'Chapter 1: Static Noise', status: 'DRAFT', words: 3200 },
        { id: 'c2', title: 'Chapter 2: The Signal', status: 'EDITING', words: 2405, active: true },
        { id: 'c3', title: 'Chapter 3: Silence', status: 'EMPTY', words: 0 },
      ]
    },
    {
      id: 'g2', title: 'Part II: Ascension', expanded: false, children: []
    }
  ];

  constructor(private router: Router) { }

  ngOnInit() {
    this.editor = new Editor({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: 'Start writing your chapter...',
        }),
      ],
      content: `
        <p>The signal was faint at first, barely a whisper against the background radiation of the cosmos. But it was there, a persistent rhythm that defied the random chaos of the void.</p>
        <p>Jara adjusted the gain on her receiver, her fingers dancing across the haptic interface. "Computer, isolate frequency band 402. Is that... is that structure?"</p>
        <blockquote>"Confirmed. Pattern analysis indicates artificial origin. Probability 99.9%."</blockquote>
        <p>She leaned back, the breath catching in her throat. For twenty years she had listened to the static. Twenty years of silence. And now, finally, a voice.</p>
      `,
      onUpdate: ({ editor }) => {
        this.wordCount.set(editor.storage.characterCount?.words?.() || 0); // Need CharacterCount extension for this, implementing naive count for now if extension missing
        // For now, let's just do a rough split
        const text = editor.getText();
        this.wordCount.set(text.split(/\s+/).filter(w => w.length > 0).length);
      }
    });
  }

  ngOnDestroy() {
    this.editor.destroy();
  }

  goBack() {
    this.router.navigate(['/novels']);
  }

  toggleChapter(group: any) {
    group.expanded = !group.expanded;
  }

  selectChapter(chapter: any) {
    this.activeChapterId.set(chapter.id);
    // Ideally load content for chapter
  }

  setActiveTab(tab: 'ai' | 'notes' | 'manuscript') {
    this.rightSidebarTab.set(tab);
  }
}
