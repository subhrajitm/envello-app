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
  activeNav = signal<'manuscript' | 'characters' | 'locations'>('manuscript');

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

  characters = [
    { id: 'ch1', name: 'Jara Vance', role: 'Protagonist', archetype: 'Scientist' },
    { id: 'ch2', name: 'Commander Rike', role: 'Antagonist', archetype: 'Military' },
    { id: 'ch3', name: 'Unit 734', role: 'Support', archetype: 'Droid' }
  ];

  locations = [
    { id: 'l1', name: 'Outpost 42', type: 'Station', desc: 'Remote listening post' },
    { id: 'l2', name: 'The Void Expanse', type: 'Space', desc: 'Sector 7G' }
  ];

  notes = [
    { id: 'n1', title: 'The Signal Protocol', body: 'Remember to define the frequency modulation clearly.', date: '2h ago' },
    { id: 'n2', title: 'Character Arc: Jara', body: 'She needs to hesitate before calling it in.', date: 'Yesterday' }
  ];

  synopsis = {
    title: 'Emerald Protocol',
    logline: 'A lone scientist discovers a structured signal from the void, triggering a protocol that was never meant to be activated.',
    theme: 'Isolation vs. Duty'
  };

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
        // Simple word count
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
  }

  setActiveTab(tab: 'ai' | 'notes' | 'manuscript') {
    this.rightSidebarTab.set(tab);
  }

  setActiveNav(nav: 'manuscript' | 'characters' | 'locations') {
    this.activeNav.set(nav);
  }
}
