import { Injectable, inject, computed } from '@angular/core';
import { StoreService } from './store.service';
import { MeetingsService } from './meetings.service';
import { Person } from '@envello/domain';
import { ContextService } from './context.service';
import { AiService } from './ai.service';

export interface PersonInteraction {
  type: 'meeting' | 'task' | 'note' | 'transaction';
  id: string;
  title: string;
  date: string;
  preview?: string;
  route: string;
}

export interface PersonProfile {
  person: Person;
  interactions: PersonInteraction[];
  lastSeen: string | null;
  totalInteractions: number;
  openTasks: number;
  upcomingMeetings: number;
}

/**
 * Relationship Intelligence: aggregates every mention of a person
 * across meetings, tasks, notes, and transactions.
 * This is only possible because all data lives in one place.
 */
@Injectable({ providedIn: 'root' })
export class RelationshipService {
  private store    = inject(StoreService);
  private meetings = inject(MeetingsService);
  private context  = inject(ContextService);
  private ai       = inject(AiService);

  /** Computed list of all known people with interaction counts. */
  readonly peopleWithStats = computed(() =>
    this.store.people().map(p => this.buildProfile(p))
  );

  /** Find a person's full cross-module profile. */
  getProfile(personId: string): PersonProfile | null {
    const person = this.store.people().find(p => p.id === personId);
    if (!person) return null;
    return this.buildProfile(person);
  }

  /**
   * Discover people who appear in existing data but aren't in the People list yet.
   * Extracts attendee names from meetings and returns de-duplicated suggestions.
   */
  discoverPeople(): { name: string; email?: string; sources: string[] }[] {
    const known = new Set(this.store.people().map(p => p.name.toLowerCase()));
    const discovered = new Map<string, { email?: string; sources: Set<string> }>();

    for (const m of this.meetings.meetings()) {
      for (const a of m.attendees) {
        const key = a.name.toLowerCase();
        if (known.has(key)) continue;
        if (!discovered.has(key)) {
          discovered.set(key, { email: a.email, sources: new Set() });
        }
        discovered.get(key)!.sources.add(`Meeting: ${m.title}`);
      }
    }

    return Array.from(discovered.entries()).map(([name, v]) => ({
      name,
      email: v.email,
      sources: Array.from(v.sources),
    })).filter(d => d.sources.length > 0);
  }

  /**
   * Auto-import a person discovered from meeting attendees.
   */
  importFromAttendee(name: string, email?: string): Person {
    const person: Person = {
      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      email,
      createdAt: new Date().toISOString(),
      tags: [],
    };
    this.store.addPerson(person);
    return person;
  }

  /**
   * Generate an AI-powered relationship summary for a person.
   * Pulls cross-module context and asks the AI to summarize the relationship.
   */
  async generateInsight(personId: string): Promise<string> {
    const profile = this.getProfile(personId);
    if (!profile) return '';

    const ctx = await this.context.buildPersonContext(profile.person.name);

    const prompt = `Based on the following interaction history, write a 2-3 sentence relationship summary for ${profile.person.name}.
Focus on: what you've worked on together, any open action items, and how recently you've interacted.

${ctx.formatted}

Keep it concise and actionable.`;

    return this.ai.sendMessage(prompt, 'You are a relationship intelligence assistant. Be concise.');
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private buildProfile(person: Person): PersonProfile {
    const name = person.name.toLowerCase();
    const interactions: PersonInteraction[] = [];
    const today = new Date();

    // Meetings where this person is an attendee
    for (const m of this.meetings.meetings()) {
      if (m.attendees.some(a => a.name.toLowerCase().includes(name))) {
        interactions.push({
          type: 'meeting',
          id: m.id,
          title: m.title,
          date: m.date,
          preview: `${m.status} · ${m.attendees.map(a => a.name).join(', ')}`,
          route: '/meetings',
        });
      }
    }

    // Tasks that mention this person
    for (const t of this.store.tasks()) {
      const text = [t.title, t.description, t.notes].filter(Boolean).join(' ').toLowerCase();
      if (text.includes(name)) {
        interactions.push({
          type: 'task',
          id: t.id,
          title: t.title,
          date: t.due ?? t.createdAt ?? today.toISOString().split('T')[0],
          preview: `${t.status} · ${t.priority}`,
          route: '/tasks',
        });
      }
    }

    // Notes that mention this person
    for (const n of this.store.notes()) {
      const text = [n.title, n.preview].filter(Boolean).join(' ').toLowerCase();
      if (text.includes(name)) {
        interactions.push({
          type: 'note',
          id: n.id,
          title: n.title,
          date: n.date,
          preview: n.preview,
          route: '/daily-notes',
        });
      }
    }

    // Sort by date desc
    interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastSeen = interactions[0]?.date ?? null;
    const openTasks = interactions.filter(i => i.type === 'task' && i.preview?.includes('ACTIVE')).length;
    const upcomingMeetings = interactions.filter(i => {
      if (i.type !== 'meeting') return false;
      return new Date(i.date) >= today;
    }).length;

    return {
      person: { ...person, lastInteraction: lastSeen ?? person.lastInteraction },
      interactions,
      lastSeen,
      totalInteractions: interactions.length,
      openTasks,
      upcomingMeetings,
    };
  }
}
