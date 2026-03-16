import { Injectable, signal, computed, inject } from '@angular/core';
import { Item, ItemType, ItemStatus } from '@envello/domain';
import { AiService } from './ai.service'; // existing AI service for parsing intent

@Injectable({
  providedIn: 'root',
})
export class ExecutionEngineService {
  private aiService = inject(AiService);

  // In-memory store (for MVP)
  // Later can be connected to SqliteDataService / PouchDB
  private itemsSignal = signal<Item[]>([]);

  // Derived state
  public items = this.itemsSignal.asReadonly();

  public activeItems = computed(() =>
    this.items().filter(
      (i) => i.status === 'todo' || i.status === 'in-progress',
    ),
  );

  public completedItems = computed(() =>
    this.items().filter((i) => i.status === 'done'),
  );

  // Initialize with some data or fetch from local DB
  loadItems(items: Item[]) {
    this.itemsSignal.set(items);
  }

  // --- Core CRUD ---

  addItem(item: Item) {
    this.itemsSignal.update((items) => [item, ...items]);
  }

  updateItem(id: string, updates: Partial<Item>) {
    this.itemsSignal.update((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, ...updates, last_edited_at: new Date().toISOString() }
          : item,
      ),
    );
  }

  deleteItem(id: string) {
    this.itemsSignal.update((items) => items.filter((item) => item.id !== id));
  }

  // --- Progress & Completion logic ---

  markCompleted(id: string) {
    this.updateItem(id, { status: 'done', progress: 100 });
  }

  updateProgress(id: string, progress: number) {
    if (progress >= 100) {
      this.updateItem(id, { progress: 100, status: 'done' });
    } else {
      this.updateItem(id, {
        progress,
        status: progress > 0 ? 'in-progress' : 'todo',
      });
    }
  }

  // --- Classification & Suggestion Engine ---

  /**
   * 8.1 Classification
   * Input analysis determines task intent, writing intent, deadline detection
   */
  async quickCapture(input: string): Promise<Item> {
    // Basic heuristics / simple AI mock (until full prompt integrates)
    const isWriting =
      input.toLowerCase().includes('write') ||
      input.toLowerCase().includes('draft') ||
      input.toLowerCase().includes('article') ||
      input.toLowerCase().includes('blog') ||
      input.toLowerCase().length > 60; // Long inputs treat as writing

    const type: ItemType = isWriting ? 'writing' : 'task';
    const status: ItemStatus = isWriting ? 'in-progress' : 'todo';

    // Quick heuristic for deadline
    let deadline: string | undefined;
    if (input.toLowerCase().includes('today')) {
      const today = new Date();
      today.setHours(23, 59, 59);
      deadline = today.toISOString();
    } else if (input.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59);
      deadline = tomorrow.toISOString();
    }

    const newItem: Item = {
      id: crypto.randomUUID(),
      title: input.length > 40 ? input.substring(0, 40) + '...' : input,
      content: input,
      type,
      status,
      progress: isWriting ? 5 : 0, // Give some progress for creating it
      deadline,
      created_at: new Date().toISOString(),
      last_edited_at: new Date().toISOString(),
      ai_generated: false,
    };

    this.addItem(newItem);
    return newItem;
  }

  /**
   * 8.2 Suggestion Ranking Logic
   * unfinished_priority_score = (100 - progress) + deadline_weight + inactivity_weight + habit_weight
   */
  public generateSuggestions(): Item[] {
    const active = this.items().filter((i) => i.status !== 'done');
    const now = new Date();

    const scored = active.map((item) => {
      const score = 100 - item.progress; // Base points for how much is left

      // Inactivity Weight
      const lastEdited = new Date(item.last_edited_at);
      const hoursInactive =
        (now.getTime() - lastEdited.getTime()) / (1000 * 60 * 60);
      let inactivityWeight = 0;
      if (hoursInactive > 24 && item.type === 'writing') {
        inactivityWeight = 20; // High nudge for abandoned writing
      } else if (hoursInactive > 72) {
        inactivityWeight = 30;
      }

      // Deadline Weight
      let deadlineWeight = 0;
      if (item.deadline) {
        const deadlineDate = new Date(item.deadline);
        const hoursUntil =
          (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntil < 24 && hoursUntil > 0) {
          deadlineWeight = 50; // Approaching soon
        } else if (hoursUntil < 0) {
          deadlineWeight = 80; // Overdue
        }
      }

      // We assign these to the derived field
      const unfinished_priority_score =
        score + inactivityWeight + deadlineWeight;
      return { ...item, unfinished_priority_score };
    });

    // Highest score surfaces first
    return scored.sort(
      (a, b) =>
        (b.unfinished_priority_score ?? 0) - (a.unfinished_priority_score ?? 0),
    );
  }
}
