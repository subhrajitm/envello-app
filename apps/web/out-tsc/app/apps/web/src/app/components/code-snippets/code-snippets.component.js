import { __decorate } from 'tslib';
import {
  Component,
  computed,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SnippetsService } from '@envello/core';
import {
  ButtonComponent,
  IconButtonComponent,
  EmptyStateComponent,
  ModalComponent,
} from '@envello/ui';
let CodeSnippetsComponent = class CodeSnippetsComponent {
  snippetsService = inject(SnippetsService);
  showAddModal = signal(false);
  newSnippet = signal({
    title: '',
    lang: 'TypeScript',
    tags: [],
    content: '',
    filename: '',
    path: '',
    creator: '',
  });
  showDetailModal = signal(false);
  editingSnippet = signal(false);
  editedSnippet = signal({});
  newTagInput = signal('');
  showQuickActions = signal(null);
  showShortcutsHelp = signal(false);
  filteredSnippets = computed(() => this.snippetsService.filteredSnippets());
  stats = computed(() => this.snippetsService.stats());
  snippetsByLang = computed(() => this.snippetsService.snippetsByLang());
  allTags = computed(() => this.snippetsService.allTags());
  selectedSnippet = computed(() => this.snippetsService.selectedSnippet());
  LANGS = this.snippetsService.LANGS;
  ngOnInit() {}
  ngOnDestroy() {}
  onDocumentClick(event) {
    if (this.showQuickActions()) {
      const el = event.target;
      if (!el.closest('.row-actions')) this.showQuickActions.set(null);
    }
  }
  onKeyDown(e) {
    const inInput =
      e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA';
    if (e.key === 'Escape') {
      if (this.showAddModal()) this.closeAddModal();
      else if (this.showDetailModal()) this.closeDetailModal();
      else if (this.showShortcutsHelp()) this.showShortcutsHelp.set(false);
      else if (this.showQuickActions()) this.showQuickActions.set(null);
      return;
    }
    if (inInput) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      this.openAddModal();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.querySelector('.snippets-search-input')?.focus();
    }
    if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.openShortcutsHelp();
    }
  }
  openAddModal() {
    this.newSnippet.set({
      title: '',
      lang: 'TypeScript',
      tags: [],
      content: '',
      filename: '',
      path: '',
      creator: '',
    });
    this.newTagInput.set('');
    this.showAddModal.set(true);
  }
  closeAddModal() {
    this.showAddModal.set(false);
  }
  addSnippet() {
    const n = this.newSnippet();
    if (!n.title?.trim()) return;
    const tags = (n.tags ?? []).slice();
    const tagStr = this.newTagInput().trim();
    if (tagStr) {
      tagStr.split(/[\s,]+/).forEach((t) => {
        const x = t.replace(/^#/, '').trim();
        if (x && !tags.includes(x)) tags.push(x);
      });
    }
    this.snippetsService.addSnippet({
      title: n.title.trim(),
      lang: n.lang ?? 'Other',
      tags,
      content: (n.content ?? '').trim(),
      filename:
        (n.filename ?? n.title ?? '').trim() || (n.title ?? '') + '.txt',
      path: (n.path ?? '').trim() || '/',
      creator: (n.creator ?? '').trim() || '@me',
    });
    this.closeAddModal();
  }
  openDetailModal(snip) {
    this.snippetsService.selectedSnippetId.set(snip.id);
    this.editedSnippet.set({ ...snip });
    this.editingSnippet.set(false);
    this.showDetailModal.set(true);
  }
  closeDetailModal() {
    this.showDetailModal.set(false);
    this.snippetsService.selectedSnippetId.set(null);
    this.editingSnippet.set(false);
  }
  startEditing() {
    const s = this.selectedSnippet();
    if (s) {
      this.editedSnippet.set({ ...s });
      this.editingSnippet.set(true);
    }
  }
  cancelEditing() {
    const s = this.selectedSnippet();
    if (s) this.editedSnippet.set({ ...s });
    this.editingSnippet.set(false);
  }
  saveEditing() {
    const s = this.selectedSnippet();
    const patch = this.editedSnippet();
    if (s && patch) {
      this.snippetsService.updateSnippet(s.id, patch);
    }
    this.editingSnippet.set(false);
  }
  deleteSnippet(snip) {
    if (confirm(`Delete "${snip.title}"?`)) {
      this.snippetsService.deleteSnippet(snip.id);
      this.closeDetailModal();
    }
  }
  copySnippet(snip) {
    const content = this.snippetsService.copyContent(snip.id);
    if (content && typeof navigator?.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(content);
    }
    this.showQuickActions.set(null);
  }
  toggleQuickActions(id, ev) {
    ev.stopPropagation();
    this.showQuickActions.update((v) => (v === id ? null : id));
  }
  getLangColor(lang) {
    const m = {
      Python: '#3776ab',
      JavaScript: '#f0db4f',
      TypeScript: '#3178c6',
      Markdown: '#083fa1',
      SQL: '#4ade80',
      HTML: '#e34f26',
      CSS: '#264de4',
      JSON: '#292929',
      Shell: '#89e051',
      Other: '#71717a',
    };
    return m[lang] ?? '#71717a';
  }
  getLineNumbers(content) {
    const n = (content || '').split('\n').length;
    return Array.from({ length: Math.max(1, n) }, (_, i) => i + 1);
  }
  formatRelative(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffM < 1) return 'now';
    if (diffM < 60) return `${diffM}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  updateNewSnippet(key, value) {
    this.newSnippet.update((n) => ({ ...n, [key]: value }));
  }
  updateEditedSnippet(key, value) {
    this.editedSnippet.update((e) => ({ ...e, [key]: value }));
  }
  addTagToNew() {
    const t = this.newTagInput().trim().replace(/^#/, '');
    if (!t) return;
    const tags = [...(this.newSnippet().tags ?? [])];
    if (tags.includes(t)) return;
    tags.push(t);
    this.newSnippet.update((n) => ({ ...n, tags }));
    this.newTagInput.set('');
  }
  removeTagFromNew(tag) {
    this.newSnippet.update((n) => ({
      ...n,
      tags: (n.tags ?? []).filter((x) => x !== tag),
    }));
  }
  openShortcutsHelp() {
    this.showShortcutsHelp.set(true);
  }
  closeShortcutsHelp() {
    this.showShortcutsHelp.set(false);
  }
};
__decorate(
  [HostListener('document:click', ['$event'])],
  CodeSnippetsComponent.prototype,
  'onDocumentClick',
  null,
);
__decorate(
  [HostListener('document:keydown', ['$event'])],
  CodeSnippetsComponent.prototype,
  'onKeyDown',
  null,
);
CodeSnippetsComponent = __decorate(
  [
    Component({
      selector: 'app-code-snippets',
      standalone: true,
      imports: [
        CommonModule,
        FormsModule,
        ButtonComponent,
        IconButtonComponent,
        EmptyStateComponent,
        ModalComponent,
      ],
      templateUrl: './code-snippets.component.html',
      styleUrl: './code-snippets.component.css',
    }),
  ],
  CodeSnippetsComponent,
);
export { CodeSnippetsComponent };
