import { Injectable, inject, signal } from '@angular/core';
import { AiService } from './ai.service';
import { StoreService } from './store.service';
import { MeetingsService, MEETING_COLORS } from './meetings.service';
import { Task, Note, Bookmark } from '@envello/domain';

export type CaptureType = 'task' | 'note' | 'meeting' | 'bookmark' | 'transaction' | 'unknown';

export interface CaptureIntent {
  type: CaptureType;
  title: string;
  fields: {
    due?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    date?: string;
    url?: string;
    amount?: number;
    attendees?: string[];
    description?: string;
  };
  confidence: number;
}

export interface CaptureResult {
  intent: CaptureIntent;
  created: boolean;
  route: string;
}

export const CAPTURE_TYPE_META: Record<CaptureType, { label: string; icon: string; color: string }> = {
  task:        { label: 'Task',        icon: 'check_circle',  color: '#fbbf24' },
  note:        { label: 'Note',        icon: 'edit_note',     color: '#34d399' },
  meeting:     { label: 'Meeting',     icon: 'calendar_month', color: '#60a5fa' },
  bookmark:    { label: 'Bookmark',    icon: 'bookmark',      color: '#a78bfa' },
  transaction: { label: 'Transaction', icon: 'receipt_long',  color: '#f87171' },
  unknown:     { label: 'Unknown',     icon: 'help',          color: '#9ca3af' },
};

@Injectable({ providedIn: 'root' })
export class CaptureService {
  private ai = inject(AiService);
  private store = inject(StoreService);
  private meetings = inject(MeetingsService);

  /** Controls the quick-capture overlay visibility. */
  isOverlayOpen = signal(false);

  open()  { this.isOverlayOpen.set(true); }
  close() { this.isOverlayOpen.set(false); }

  async classify(text: string): Promise<CaptureIntent> {
    const fallback = this.heuristicClassify(text);

    if (!this.ai.aiEnabled() || this.ai.provider() === 'mock') {
      return fallback;
    }

    try {
      const prompt = `Classify this user input into ONE of: task, note, meeting, bookmark, transaction.
Extract relevant fields. Output ONLY compact JSON, no markdown fences.

Input: "${text}"

JSON schema:
{"type":"task|note|meeting|bookmark|transaction","title":"<clean title>","fields":{"due":"ISO date or null","priority":"HIGH|MEDIUM|LOW or null","date":"ISO date or null","url":"URL or null","amount":number or null,"attendees":["name"] or []},"confidence":0.0-1.0}`;

      const raw = await this.ai.sendMessage(prompt, 'You classify productivity inputs and return only JSON.');
      const clean = raw.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed: CaptureIntent = JSON.parse(clean);
      // Merge: keep heuristic fields if AI omits them
      return { ...fallback, ...parsed, fields: { ...fallback.fields, ...parsed.fields } };
    } catch {
      return fallback;
    }
  }

  async dispatch(intent: CaptureIntent): Promise<CaptureResult> {
    const now = new Date();

    switch (intent.type) {
      case 'task': {
        const task: Task = {
          id: `task-${crypto.randomUUID()}`,
          title: intent.title,
          priority: intent.fields.priority ?? 'MEDIUM',
          hours: '1.0H',
          status: 'ACTIVE',
          due: intent.fields.due ?? undefined,
          createdAt: now.toISOString(),
        };
        this.store.addTask(task);
        return { intent, created: true, route: '/tasks' };
      }

      case 'note': {
        const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const note: Note = {
          id: `note-${crypto.randomUUID()}`,
          date: dateStr,
          title: intent.title.slice(0, 80),
          preview: intent.title,
          content: `<p>${intent.title}</p>`,
          tags: [],
          lastEdited: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        await this.store.addNote(note);
        return { intent, created: true, route: '/daily-notes' };
      }

      case 'meeting': {
        const dateStr = intent.fields.date ?? now.toISOString().split('T')[0];
        const h = (now.getHours() + 1) % 24;
        this.meetings.addMeeting({
          title: intent.title,
          date: dateStr,
          startTime: `${String(h).padStart(2, '0')}:00`,
          endTime: `${String((h + 1) % 24).padStart(2, '0')}:00`,
          duration: 60,
          meetingType: 'video',
          attendees: (intent.fields.attendees ?? []).map((name, i) => ({ id: `a-${i}`, name })),
          status: 'scheduled',
          color: MEETING_COLORS[0],
        });
        return { intent, created: true, route: '/meetings' };
      }

      case 'bookmark': {
        const bm: Bookmark = {
          id: `bm-${crypto.randomUUID()}`,
          title: intent.title,
          url: intent.fields.url ?? 'https://',
          createdAt: now.toISOString(),
          tags: [],
        };
        this.store.addBookmark(bm);
        return { intent, created: true, route: '/bookmarks' };
      }

      case 'transaction':
        return { intent, created: false, route: '/transactions' };

      default:
        return { intent, created: false, route: '/' };
    }
  }

  // ─── Heuristic fallback ────────────────────────────────────────────────────

  private heuristicClassify(text: string): CaptureIntent {
    const t = text.toLowerCase();

    if (/https?:\/\//.test(text)) {
      return { type: 'bookmark', title: text, fields: { url: text.match(/https?:\/\/\S+/)?.[0] }, confidence: 0.9 };
    }

    if (/\b(meeting|standup|sync|interview|coffee with|lunch with|chat with|call with|meet with)\b/.test(t)) {
      return { type: 'meeting', title: text, fields: { date: this.extractDate(t), attendees: this.extractNames(text) }, confidence: 0.8 };
    }

    if (/[$£€¥]|\b(paid|pay|invoice|bill|subscription|rent|salary|expense|cost|refund)\b/.test(t)) {
      const m = text.match(/\d+\.?\d*/);
      return { type: 'transaction', title: text, fields: { amount: m ? parseFloat(m[0]) : undefined }, confidence: 0.8 };
    }

    if (/\b(todo|to-do|task|fix|build|ship|send|review|check|remind|buy|get|make|update|add|write|finish|complete|draft)\b/.test(t)) {
      return { type: 'task', title: text, fields: { due: this.extractDate(t), priority: this.extractPriority(t) }, confidence: 0.75 };
    }

    return { type: 'note', title: text, fields: {}, confidence: 0.5 };
  }

  private extractDate(lower: string): string | undefined {
    const d = new Date();
    if (/\btomorrow\b/.test(lower)) { d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }
    if (/\btoday\b/.test(lower))    { return d.toISOString().split('T')[0]; }
    if (/\bnext week\b/.test(lower)) { d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; }
    if (/\bnext month\b/.test(lower)) { d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]; }
    const m = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i);
    if (m) { try { return new Date(m[0]).toISOString().split('T')[0]; } catch { /* ignore */ } }
    return undefined;
  }

  private extractPriority(lower: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (/\b(urgent|asap|critical|high priority|important)\b/.test(lower)) return 'HIGH';
    if (/\b(low|minor|whenever|eventually|someday)\b/.test(lower))        return 'LOW';
    return 'MEDIUM';
  }

  private extractNames(text: string): string[] {
    const SKIP = new Set(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
      'January','February','March','April','June','July','August','September','October','November','December',
      'Meeting','Task','Note','Today','Tomorrow']);
    return (text.match(/\b[A-Z][a-z]{1,}/g) ?? []).filter(n => !SKIP.has(n));
  }
}
