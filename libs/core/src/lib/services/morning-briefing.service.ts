import { Injectable, inject } from '@angular/core';
import { StoreService } from './store.service';
import { MeetingsService } from './meetings.service';
import { AiService } from './ai.service';
import { Task, Note } from '@envello/domain';

export interface BriefingData {
  dateLabel: string;         // "Monday, June 30"
  today: string;             // "2026-06-30"
  overdueTasks: Task[];
  todayTasks: Task[];
  todayMeetings: { title: string; startTime: string; meetingType: string }[];
  recentNotes: Note[];
  activeBook?: { title: string; wordCount: number; targetWordCount: number; progress: number };
  totalPending: number;
}

const STORAGE_KEY = 'envello-briefing-date';

@Injectable({ providedIn: 'root' })
export class MorningBriefingService {
  private store    = inject(StoreService);
  private meetings = inject(MeetingsService);
  private ai       = inject(AiService);

  /** Returns true if the briefing hasn't been shown yet today. */
  shouldShow(): boolean {
    const today = this.todayStr();
    return localStorage.getItem(STORAGE_KEY) !== today;
  }

  /** Call when the user dismisses the briefing. */
  markShown(): void {
    localStorage.setItem(STORAGE_KEY, this.todayStr());
  }

  /** Assemble today's data snapshot from in-memory signals. */
  collectData(): BriefingData {
    const today = this.todayStr();
    const allTasks = this.flattenTasks(this.store.tasks());

    const overdueTasks = allTasks.filter(
      t => t.due && t.due < today && t.status !== 'COMPLETED',
    );
    const todayTasks = allTasks.filter(
      t => t.due === today && t.status !== 'COMPLETED',
    );
    const totalPending = allTasks.filter(t => t.status !== 'COMPLETED').length;

    const todayMeetings = this.meetings.meetings()
      .filter(m => m.date === today && m.status !== 'cancelled')
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
      .map(m => ({ title: m.title, startTime: m.startTime, meetingType: m.meetingType }));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const recentNotes = this.store.notes()
      .filter(n => (n.lastEdited ?? n.date) >= yesterdayStr)
      .sort((a, b) => (b.lastEdited ?? b.date).localeCompare(a.lastEdited ?? a.date))
      .slice(0, 4);

    const activeBook = this.store.books()
      .filter(b => b.status === 'DRAFTING' || b.status === 'REVISING')
      .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))[0];

    const dateLabel = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    return {
      dateLabel,
      today,
      overdueTasks,
      todayTasks,
      todayMeetings,
      recentNotes,
      totalPending,
      activeBook: activeBook
        ? {
            title: activeBook.title,
            wordCount: activeBook.wordCount,
            targetWordCount: activeBook.targetWordCount,
            progress: activeBook.progress,
          }
        : undefined,
    };
  }

  /** Stream the AI narrative for the given data snapshot. */
  async *generateNarrative(data: BriefingData): AsyncIterable<string> {
    if (!this.ai.aiEnabled()) return;

    const overdueLine = data.overdueTasks.length
      ? `${data.overdueTasks.length} overdue task${data.overdueTasks.length > 1 ? 's' : ''} (${data.overdueTasks.slice(0, 2).map(t => `"${t.title}"`).join(', ')}${data.overdueTasks.length > 2 ? '…' : ''})`
      : 'no overdue tasks';

    const todayLine = data.todayTasks.length
      ? `${data.todayTasks.length} task${data.todayTasks.length > 1 ? 's' : ''} due today (${data.todayTasks.slice(0, 2).map(t => `"${t.title}"`).join(', ')}${data.todayTasks.length > 2 ? '…' : ''})`
      : 'nothing due today';

    const meetingsLine = data.todayMeetings.length
      ? `${data.todayMeetings.length} meeting${data.todayMeetings.length > 1 ? 's' : ''} (${data.todayMeetings.map(m => `${m.startTime} ${m.title}`).join(', ')})`
      : 'no meetings today';

    const bookLine = data.activeBook
      ? `Working on "${data.activeBook.title}" — ${data.activeBook.wordCount.toLocaleString()} / ${data.activeBook.targetWordCount.toLocaleString()} words (${data.activeBook.progress}%)`
      : '';

    const systemPrompt = `You are a personal morning briefing assistant inside Envello, a productivity app.
Write a warm, encouraging 2-3 sentence morning message based on the user's data.
Be specific and actionable. End with one clear focus recommendation for today.
Write in natural flowing prose — no bullet points, no headers. Keep it under 65 words.`;

    const userPrompt = `Today is ${data.dateLabel}.
Tasks: ${overdueLine}; ${todayLine}.
Meetings: ${meetingsLine}.
${bookLine}
Total pending tasks: ${data.totalPending}.
${data.recentNotes.length ? `Recent notes: ${data.recentNotes.map(n => `"${n.title}"`).join(', ')}.` : ''}`;

    yield* this.ai.streamMessage(userPrompt, systemPrompt);
  }

  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private flattenTasks(tasks: Task[]): Task[] {
    const out: Task[] = [];
    for (const t of tasks) {
      out.push(t);
      if (t.subtasks?.length) out.push(...this.flattenTasks(t.subtasks as Task[]));
    }
    return out;
  }
}
