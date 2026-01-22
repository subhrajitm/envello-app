import { Component, OnDestroy, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NovelContentService, Chapter, ChapterGroup } from '../../../services/novel-content.service';

@Component({
  selector: 'app-novel-editor',
  standalone: true,
  imports: [CommonModule, TiptapEditorDirective, FormsModule],
  templateUrl: './novel-editor.component.html',
  styleUrl: './novel-editor.component.css'
})
export class NovelEditorComponent implements OnInit, OnDestroy {
  editor!: Editor;
  novelService = inject(NovelContentService);
  route = inject(ActivatedRoute);

  // State
  title = signal('');
  activeChapterId = signal<string | null>(null);
  wordCount = signal(0);
  rightSidebarTab = signal<'ai' | 'notes' | 'manuscript'>('ai');
  activeNav = signal<'manuscript' | 'characters' | 'locations'>('manuscript');

  // Time tracking
  sessionStartTime = Date.now();
  elapsedSeconds = signal(0);
  targetWordCount = signal(2500);

  // Computed signals from Service
  novel = this.novelService.activeNovel;

  constructor(private router: Router) {
    // Effect to update editor content when active chapter changes
    effect(() => {
      const chapterId = this.activeChapterId();
      if (chapterId && this.editor) {
        const chapter = this.novelService.getChapter(chapterId);
        if (chapter && this.editor.getHTML() !== chapter.content) {
          this.editor.commands.setContent(chapter.content);
          this.title.set(chapter.title);
          this.wordCount.set(chapter.wordCount);
        }
      }
    });

    // Effect to set initial title from novel data
    effect(() => {
      const n = this.novel();
      if (n && !this.activeChapterId()) {
        // Default to first chapter
        if (n.chapters.length > 0 && n.chapters[0].children.length > 0) {
          this.selectChapter(n.chapters[0].children[0]);
        }
      }
    });

    // Time tracking interval
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      this.elapsedSeconds.set(elapsed);
    }, 1000);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '1';
    this.novelService.loadNovel(id);

    this.editor = new Editor({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: 'Start writing your chapter...',
        }),
      ],
      content: '', // Initial content will be set by effect
      onUpdate: ({ editor }) => {
        const text = editor.getText();
        const count = text.split(/\s+/).filter(w => w.length > 0).length;
        this.wordCount.set(count);

        // Auto-save to service
        const activeId = this.activeChapterId();
        if (activeId) {
          this.novelService.updateChapterContent(activeId, editor.getHTML(), count);
        }
      }
    });
  }

  ngOnDestroy() {
    this.editor.destroy();
  }

  goBack() {
    this.router.navigate(['/novels']);
  }

  toggleChapter(group: ChapterGroup) {
    this.novelService.toggleGroupExpand(group.id);
  }

  selectChapter(chapter: Chapter) {
    this.activeChapterId.set(chapter.id);
  }

  setActiveTab(tab: 'ai' | 'notes' | 'manuscript') {
    this.rightSidebarTab.set(tab);
  }

  setActiveNav(nav: 'manuscript' | 'characters' | 'locations') {
    this.activeNav.set(nav);
  }

  // Title editing
  onTitleChange(newTitle: string) {
    this.title.set(newTitle);
    const activeId = this.activeChapterId();
    if (activeId) {
      this.novelService.updateChapterTitle(activeId, newTitle);
    }
  }

  // Chapter management
  addNewChapter(groupId: string) {
    this.novelService.addChapter(groupId);
  }

  // Note management
  addNewNote() {
    const title = prompt('Note title:');
    if (title) {
      this.novelService.addNote(title, '', this.activeChapterId() || undefined);
    }
  }

  deleteNote(noteId: string) {
    if (confirm('Delete this note?')) {
      this.novelService.deleteNote(noteId);
    }
  }

  // Character management
  addNewCharacter() {
    const name = prompt('Character name:');
    if (name) {
      this.novelService.addCharacter(name);
    }
  }

  // Location management
  addNewLocation() {
    const name = prompt('Location name:');
    if (name) {
      this.novelService.addLocation(name);
    }
  }

  // Time formatting
  getFormattedTime(): string {
    const seconds = this.elapsedSeconds();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
}
