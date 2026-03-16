import { __decorate } from 'tslib';
import { logIfTauri } from '../utils/tauri-helpers';
import { Injectable, signal, inject } from '@angular/core';
import { DataService } from '@envello/data';
import { StoreService } from './store.service';
let ResearchService = class ResearchService {
  db = inject(DataService);
  store = inject(StoreService);
  libraries = signal([]);
  sources = signal([]);
  summaries = signal([]);
  constructor() {
    this.loadFromDb();
  }
  async loadFromDb() {
    try {
      const [libs, srcs, sums] = await Promise.all([
        this.db.getAll('research_libraries'),
        this.db.getAll('research_sources'),
        this.db.getAll('research_summaries'),
      ]);
      this.libraries.set(libs);
      this.sources.set(srcs);
      this.summaries.set(sums);
    } catch (e) {
      logIfTauri('[ResearchService] loadFromDb failed', e);
    }
  }
  persistLibrary(lib) {
    this.db
      .upsert('research_libraries', lib)
      .catch((e) => logIfTauri('[ResearchService] persist library failed', e));
  }
  persistSource(s) {
    this.db
      .upsert('research_sources', s)
      .catch((e) => logIfTauri('[ResearchService] persist source failed', e));
  }
  persistSummary(s) {
    this.db
      .upsert('research_summaries', s)
      .catch((e) => logIfTauri('[ResearchService] persist summary failed', e));
  }
  // Library methods
  addLibrary(library) {
    const newLibrary = {
      ...library,
      id: crypto.randomUUID(),
      createdDate: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
    };
    this.libraries.update((list) => [newLibrary, ...list]);
    this.persistLibrary(newLibrary);
    // Auto-create Project
    const projectId = crypto.randomUUID();
    this.store.addProject({
      id: projectId,
      title: newLibrary.name,
      description: newLibrary.description || 'Research Library',
      status: 'PLANNING',
      words: '0',
      updated: new Date().toISOString(),
      icon: 'science',
      linkedResources: {
        research: [newLibrary.id],
      },
    });
    return newLibrary;
  }
  updateLibrary(id, updates) {
    this.libraries.update((list) =>
      list.map((lib) =>
        lib.id === id
          ? {
              ...lib,
              ...updates,
              lastModified: new Date().toISOString().split('T')[0],
            }
          : lib,
      ),
    );
    const lib = this.libraries().find((l) => l.id === id);
    if (lib) this.persistLibrary(lib);
  }
  async deleteLibrary(id) {
    const srcs = this.sources().filter((s) => s.libraryId === id);
    const sums = this.summaries().filter((s) => s.libraryId === id);
    for (const s of srcs)
      await this.db.remove('research_sources', s.id).catch(() => {});
    for (const s of sums)
      await this.db.remove('research_summaries', s.id).catch(() => {});
    this.sources.update((list) => list.filter((s) => s.libraryId !== id));
    this.summaries.update((list) => list.filter((s) => s.libraryId !== id));
    this.libraries.update((list) => list.filter((lib) => lib.id !== id));
    await this.db
      .remove('research_libraries', id)
      .catch((e) => logIfTauri('[ResearchService] remove library failed', e));
  }
  // Source methods
  addSource(source) {
    const newSource = {
      ...source,
      id: crypto.randomUUID(),
      createdDate: new Date().toISOString().split('T')[0],
    };
    this.sources.update((list) => [newSource, ...list]);
    this.persistSource(newSource);
    return newSource;
  }
  updateSource(id, updates) {
    this.sources.update((list) =>
      list.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
    const s = this.sources().find((x) => x.id === id);
    if (s) this.persistSource(s);
  }
  deleteSource(id) {
    this.sources.update((list) => list.filter((s) => s.id !== id));
    this.summaries.update((list) =>
      list.map((summary) => ({
        ...summary,
        sourceIds: summary.sourceIds.filter((sid) => sid !== id),
      })),
    );
    this.db
      .remove('research_sources', id)
      .catch((e) => logIfTauri('[ResearchService] remove source failed', e));
    this.summaries()
      .filter((s) => s.sourceIds.includes(id))
      .forEach((s) => this.persistSummary(s));
  }
  getSourcesByLibrary(libraryId) {
    return this.sources().filter((s) => s.libraryId === libraryId);
  }
  // Summary methods
  addSummary(summary) {
    const newSummary = {
      ...summary,
      id: crypto.randomUUID(),
      createdDate: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
    };
    this.summaries.update((list) => [newSummary, ...list]);
    this.persistSummary(newSummary);
    return newSummary;
  }
  updateSummary(id, updates) {
    this.summaries.update((list) =>
      list.map((s) =>
        s.id === id
          ? {
              ...s,
              ...updates,
              lastModified: new Date().toISOString().split('T')[0],
            }
          : s,
      ),
    );
    const s = this.summaries().find((x) => x.id === id);
    if (s) this.persistSummary(s);
  }
  deleteSummary(id) {
    this.summaries.update((list) => list.filter((s) => s.id !== id));
    this.db
      .remove('research_summaries', id)
      .catch((e) => logIfTauri('[ResearchService] remove summary failed', e));
  }
  getSummariesByLibrary(libraryId) {
    return this.summaries().filter((s) => s.libraryId === libraryId);
  }
};
ResearchService = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  ResearchService,
);
export { ResearchService };
