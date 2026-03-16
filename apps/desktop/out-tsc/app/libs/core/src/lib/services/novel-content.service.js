import { __decorate } from 'tslib';
import { logIfTauri } from '../utils/tauri-helpers';
import { Injectable, signal, inject } from '@angular/core';
import { StoreService } from './store.service';
import { BinService } from './bin.service';
import { SqliteService } from './sqlite.service';
const PERSIST_DEBOUNCE_MS = 500;
let NovelContentService = class NovelContentService {
  activeNovel = signal(null);
  store = inject(StoreService);
  bin = inject(BinService);
  db = inject(SqliteService);
  persistTimeout = null;
  constructor() {}
  async loadNovel(id) {
    this.activeNovel.set(null);
    try {
      const raw = await this.db.getNovelContent(id);
      if (raw) {
        const data = JSON.parse(raw);
        this.activeNovel.set(data);
        return;
      }
      const data = this.createEmptyNovel(id);
      this.activeNovel.set(data);
      await this.db.setNovelContent(id, JSON.stringify(data));
    } catch (e) {
      logIfTauri('[NovelContentService] loadNovel failed', e);
      // Fallback to LocalStorage for browser development
      const localData = localStorage.getItem(`novel_content_${id}`);
      if (localData) {
        try {
          this.activeNovel.set(JSON.parse(localData));
        } catch (parseError) {
          console.error('Failed to parse local storage novel data', parseError);
          this.activeNovel.set(this.createEmptyNovel(id));
        }
      } else {
        const empty = this.createEmptyNovel(id);
        this.activeNovel.set(empty);
        localStorage.setItem(`novel_content_${id}`, JSON.stringify(empty));
      }
    }
  }
  schedulePersist() {
    if (this.persistTimeout) clearTimeout(this.persistTimeout);
    this.persistTimeout = setTimeout(() => {
      this.persistTimeout = null;
      const n = this.activeNovel();
      if (!n) return;
      this.db.setNovelContent(n.id, JSON.stringify(n)).catch((e) => {
        logIfTauri('[NovelContentService] persist failed', e);
        // Fallback to LocalStorage
        localStorage.setItem(`novel_content_${n.id}`, JSON.stringify(n));
      });
    }, PERSIST_DEBOUNCE_MS);
  }
  getChapter(chapterId) {
    const novel = this.activeNovel();
    if (!novel) return undefined;
    for (const group of novel.chapters) {
      const found = group.children.find((c) => c.id === chapterId);
      if (found) return found;
    }
    return undefined;
  }
  updateChapterContent(chapterId, content, wordCount) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newChapters = novel.chapters.map((group) => ({
        ...group,
        children: group.children.map((chap) => {
          if (chap.id === chapterId) {
            return {
              ...chap,
              content,
              wordCount,
              lastEdited: 'Just Now',
              status: 'EDITING',
            };
          }
          return chap;
        }),
      }));
      return { ...novel, chapters: newChapters };
    });
    this.schedulePersist();
  }
  toggleGroupExpand(groupId) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      return {
        ...novel,
        chapters: novel.chapters.map((g) =>
          g.id === groupId ? { ...g, expanded: !g.expanded } : g,
        ),
      };
    });
    this.schedulePersist();
  }
  updateChapterTitle(chapterId, title) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newChapters = novel.chapters.map((group) => ({
        ...group,
        children: group.children.map((chap) => {
          if (chap.id === chapterId) {
            return { ...chap, title };
          }
          return chap;
        }),
      }));
      return { ...novel, chapters: newChapters };
    });
    this.schedulePersist();
  }
  updateChapterTags(chapterId, tags) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newChapters = novel.chapters.map((group) => ({
        ...group,
        children: group.children.map((chap) => {
          if (chap.id === chapterId) {
            return { ...chap, tags };
          }
          return chap;
        }),
      }));
      return { ...novel, chapters: newChapters };
    });
    this.schedulePersist();
  }
  updateChapterSummary(chapterId, summary) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newChapters = novel.chapters.map((group) => ({
        ...group,
        children: group.children.map((chap) => {
          if (chap.id === chapterId) {
            return { ...chap, summary };
          }
          return chap;
        }),
      }));
      return { ...novel, chapters: newChapters };
    });
    this.schedulePersist();
  }
  // Chapter Management
  addChapter(groupId, title = 'Untitled Chapter') {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newChapters = novel.chapters.map((group) => {
        if (group.id === groupId) {
          const newChapter = {
            id: `c${Date.now()}`,
            title,
            content: '',
            status: 'EMPTY',
            wordCount: 0,
            lastEdited: 'Never',
          };
          return { ...group, children: [...group.children, newChapter] };
        }
        return group;
      });
      this.store.addActivity(`Created new chapter '${title}'`, 'entry');
      return { ...novel, chapters: newChapters };
    });
    this.schedulePersist();
  }
  deleteChapter(chapterId) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      // Capture the chapter before removing it so we can move it to the bin
      let chapterToDelete;
      let groupIdForChapter;
      for (const group of novel.chapters) {
        const found = group.children.find((c) => c.id === chapterId);
        if (found) {
          chapterToDelete = found;
          groupIdForChapter = group.id;
          break;
        }
      }
      if (chapterToDelete) {
        this.bin.addToBin({
          type: 'novel-chapter',
          originalId: chapterToDelete.id,
          contextId: novel.id,
          title: chapterToDelete.title,
          payload: {
            ...chapterToDelete,
            groupId: groupIdForChapter,
          },
        });
      }
      const newChapters = novel.chapters.map((group) => ({
        ...group,
        children: group.children.filter((chap) => chap.id !== chapterId),
      }));
      this.store.addActivity('Deleted chapter', 'system');
      return { ...novel, chapters: newChapters };
    });
    this.schedulePersist();
  }
  addChapterGroup(title = 'New Part') {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newGroup = {
        id: `g${Date.now()}`,
        title,
        expanded: true,
        children: [],
      };
      return { ...novel, chapters: [...novel.chapters, newGroup] };
    });
    this.schedulePersist();
  }
  reorderChapterGroup(fromIndex, toIndex) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const groups = [...novel.chapters];
      const [moved] = groups.splice(fromIndex, 1);
      groups.splice(toIndex, 0, moved);
      return { ...novel, chapters: groups };
    });
    this.schedulePersist();
  }
  reorderChapter(groupId, fromIndex, toIndex) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newChapters = novel.chapters.map((group) => {
        if (group.id === groupId) {
          const children = [...group.children];
          const [moved] = children.splice(fromIndex, 1);
          children.splice(toIndex, 0, moved);
          return { ...group, children };
        }
        return group;
      });
      return { ...novel, chapters: newChapters };
    });
    this.schedulePersist();
  }
  deleteChapterGroup(groupId) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      // Capture the group before removing it so we can move it to the bin
      const groupToDelete = novel.chapters.find((g) => g.id === groupId);
      if (groupToDelete) {
        // Move all chapters in the group to bin
        groupToDelete.children.forEach((chapter) => {
          this.bin.addToBin({
            type: 'novel-chapter',
            originalId: chapter.id,
            contextId: novel.id,
            title: chapter.title,
            payload: {
              ...chapter,
              groupId: groupId,
            },
          });
        });
        // Move the group itself to bin
        this.bin.addToBin({
          type: 'novel-group',
          originalId: groupToDelete.id,
          contextId: novel.id,
          title: groupToDelete.title,
          payload: groupToDelete,
        });
      }
      const newChapters = novel.chapters.filter(
        (group) => group.id !== groupId,
      );
      this.store.addActivity('Deleted act/part', 'system');
      return { ...novel, chapters: newChapters };
    });
    this.schedulePersist();
  }
  // Note Management
  addNote(title, body = '', chapterId) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newNote = {
        id: `n${Date.now()}`,
        title,
        body,
        date: 'Just now',
        chapterId,
      };
      this.store.addActivity(`Added note '${title}'`, 'entry');
      return { ...novel, notes: [...novel.notes, newNote] };
    });
    this.schedulePersist();
  }
  updateNote(noteId, title, body) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newNotes = novel.notes.map((note) =>
        note.id === noteId ? { ...note, title, body, date: 'Just now' } : note,
      );
      return { ...novel, notes: newNotes };
    });
    this.schedulePersist();
  }
  deleteNote(noteId) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const noteToDelete = novel.notes.find((note) => note.id === noteId);
      if (noteToDelete) {
        this.bin.addToBin({
          type: 'novel-note',
          originalId: noteToDelete.id,
          contextId: novel.id,
          title: noteToDelete.title,
          payload: noteToDelete,
        });
      }
      return {
        ...novel,
        notes: novel.notes.filter((note) => note.id !== noteId),
      };
    });
    this.schedulePersist();
  }
  // Character Management
  addCharacter(name, role = 'Supporting', archetype = '', description = '') {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newCharacter = {
        id: `ch${Date.now()}`,
        name,
        role,
        archetype,
        description,
      };
      this.store.addActivity(`Added character '${name}'`, 'entry');
      return { ...novel, characters: [...novel.characters, newCharacter] };
    });
    this.schedulePersist();
  }
  updateCharacter(characterId, updates) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newCharacters = novel.characters.map((char) =>
        char.id === characterId ? { ...char, ...updates } : char,
      );
      return { ...novel, characters: newCharacters };
    });
    this.schedulePersist();
  }
  deleteCharacter(characterId) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const characterToDelete = novel.characters.find(
        (char) => char.id === characterId,
      );
      if (characterToDelete) {
        this.bin.addToBin({
          type: 'novel-character',
          originalId: characterToDelete.id,
          contextId: novel.id,
          title: characterToDelete.name,
          payload: characterToDelete,
        });
      }
      return {
        ...novel,
        characters: novel.characters.filter((char) => char.id !== characterId),
      };
    });
    this.schedulePersist();
  }
  // Location Management
  addLocation(name, type = 'Location', description = '') {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newLocation = {
        id: `l${Date.now()}`,
        name,
        type,
        description,
      };
      this.store.addActivity(`Added location '${name}'`, 'entry');
      return { ...novel, locations: [...novel.locations, newLocation] };
    });
    this.schedulePersist();
  }
  updateLocation(locationId, updates) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newLocations = novel.locations.map((loc) =>
        loc.id === locationId ? { ...loc, ...updates } : loc,
      );
      return { ...novel, locations: newLocations };
    });
    this.schedulePersist();
  }
  deleteLocation(locationId) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const locationToDelete = novel.locations.find(
        (loc) => loc.id === locationId,
      );
      if (locationToDelete) {
        this.bin.addToBin({
          type: 'novel-location',
          originalId: locationToDelete.id,
          contextId: novel.id,
          title: locationToDelete.name,
          payload: locationToDelete,
        });
      }
      return {
        ...novel,
        locations: novel.locations.filter((loc) => loc.id !== locationId),
      };
    });
    this.schedulePersist();
  }
  // Novel Metadata
  updateNovelTitle(title) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      return { ...novel, title };
    });
    this.schedulePersist();
  }
  updateSynopsis(logline, theme) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      return { ...novel, synopsis: { logline, theme } };
    });
    this.schedulePersist();
  }
  // Front Matter Management
  addFrontMatterItem(type, title) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const newItem = {
        id: `fm${Date.now()}`,
        type,
        title,
        content: '',
        wordCount: 0,
        lastEdited: 'Never',
      };
      this.store.addActivity(`Added ${title}`, 'entry');
      return { ...novel, frontMatter: [...novel.frontMatter, newItem] };
    });
    this.schedulePersist();
  }
  updateFrontMatterContent(itemId, content, wordCount) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const updatedFrontMatter = novel.frontMatter.map((item) =>
        item.id === itemId
          ? { ...item, content, wordCount, lastEdited: 'Just now' }
          : item,
      );
      return { ...novel, frontMatter: updatedFrontMatter };
    });
    this.schedulePersist();
  }
  updateFrontMatterTitle(itemId, title) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const updatedFrontMatter = novel.frontMatter.map((item) =>
        item.id === itemId ? { ...item, title } : item,
      );
      return { ...novel, frontMatter: updatedFrontMatter };
    });
    this.schedulePersist();
  }
  deleteFrontMatterItem(itemId) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const itemToDelete = novel.frontMatter.find((item) => item.id === itemId);
      if (itemToDelete) {
        this.bin.addToBin({
          type: 'novel-note', // Reuse note type for now
          originalId: itemToDelete.id,
          contextId: novel.id,
          title: itemToDelete.title,
          payload: itemToDelete,
        });
      }
      this.store.addActivity('Deleted front matter item', 'system');
      return {
        ...novel,
        frontMatter: novel.frontMatter.filter((item) => item.id !== itemId),
      };
    });
    this.schedulePersist();
  }
  // Prologue Management
  addPrologue(title = 'Prologue') {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const prologue = {
        id: `pro${Date.now()}`,
        title,
        content: '',
        status: 'EMPTY',
        wordCount: 0,
        lastEdited: 'Never',
      };
      this.store.addActivity('Added prologue', 'entry');
      return { ...novel, prologue };
    });
    this.schedulePersist();
  }
  updatePrologueContent(content, wordCount) {
    this.activeNovel.update((novel) => {
      if (!novel || !novel.prologue) return null;
      return {
        ...novel,
        prologue: {
          ...novel.prologue,
          content,
          wordCount,
          lastEdited: 'Just now',
        },
      };
    });
    this.schedulePersist();
  }
  updatePrologueTitle(title) {
    this.activeNovel.update((novel) => {
      if (!novel || !novel.prologue) return null;
      return {
        ...novel,
        prologue: { ...novel.prologue, title },
      };
    });
    this.schedulePersist();
  }
  deletePrologue() {
    this.activeNovel.update((novel) => {
      if (!novel || !novel.prologue) return null;
      this.bin.addToBin({
        type: 'novel-note',
        originalId: novel.prologue.id,
        contextId: novel.id,
        title: novel.prologue.title,
        payload: novel.prologue,
      });
      this.store.addActivity('Deleted prologue', 'system');
      const { prologue, ...rest } = novel;
      return rest;
    });
    this.schedulePersist();
  }
  // Plot Points Management
  updateChapterPlotPoint(chapterId, plotPoint, content) {
    this.activeNovel.update((novel) => {
      if (!novel) return null;
      const updatedChapters = novel.chapters.map((group) => ({
        ...group,
        children: group.children.map((chap) => {
          if (chap.id === chapterId) {
            return {
              ...chap,
              plotPoints: {
                ...chap.plotPoints,
                [plotPoint]: content,
              },
            };
          }
          return chap;
        }),
      }));
      return { ...novel, chapters: updatedChapters };
    });
    this.schedulePersist();
  }
  /** Create and persist empty novel content (e.g. when adding a new novel from the list). */
  async createAndPersistEmptyNovel(id, title) {
    const data = this.createEmptyNovel(id, title);
    try {
      await this.db.setNovelContent(id, JSON.stringify(data));
    } catch (e) {
      logIfTauri(
        '[NovelContentService] Persist failed, falling back to LocalStorage',
        e,
      );
      localStorage.setItem(`novel_content_${id}`, JSON.stringify(data));
    }
  }
  createEmptyNovel(id, title = 'Untitled Novel') {
    return {
      id,
      title,
      synopsis: { logline: '', theme: '' },
      frontMatter: [],
      chapters: [{ id: 'g1', title: 'Part 1', expanded: true, children: [] }],
      characters: [],
      locations: [],
      notes: [],
    };
  }
};
NovelContentService = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  NovelContentService,
);
export { NovelContentService };
