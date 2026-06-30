import { Injectable, inject } from '@angular/core';
import { StoreService } from './store.service';
import { MeetingsService } from './meetings.service';
import { Task } from '@envello/domain';

export interface DayBar {
  date: string;   // YYYY-MM-DD
  label: string;  // "Mon" or "15"
  tasks: number;
  notes: number;
  meetings: number;
  height: number; // 0–100 for chart scaling
}

export interface AnalyticsStats {
  period: number;
  from: string;

  tasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
    createdInPeriod: number;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    topProjects: { name: string; count: number }[];
  };

  notes: {
    total: number;
    createdInPeriod: number;
    editedInPeriod: number;
    topTags: { tag: string; count: number }[];
  };

  meetings: {
    total: number;
    inPeriod: number;
    totalMinutes: number;
    avgDuration: number;
    byType: Record<string, number>;
  };

  writing: {
    totalWords: number;
    totalTarget: number;
    overallProgress: number;
    books: { title: string; wordCount: number; targetWordCount: number; progress: number; status: string }[];
  };

  bookmarks: {
    total: number;
    savedInPeriod: number;
    totalVisits: number;
  };

  daily: DayBar[];
  productivityScore: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private store    = inject(StoreService);
  private meetings = inject(MeetingsService);

  compute(period: number): AnalyticsStats {
    const today = new Date();
    const from  = new Date(today);
    from.setDate(from.getDate() - period);
    const fromStr  = from.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const tasks     = this.taskStats(fromStr, todayStr);
    const notes     = this.noteStats(fromStr);
    const meetings  = this.meetingStats(fromStr);
    const writing   = this.writingStats();
    const bookmarks = this.bookmarkStats(fromStr);
    const daily     = this.buildDailyBars(fromStr, todayStr, period);
    const score     = this.productivityScore(tasks, notes, meetings, writing);

    return { period, from: fromStr, tasks, notes, meetings, writing, bookmarks, daily, productivityScore: score };
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  private taskStats(from: string, today: string) {
    const all = this.flattenTasks(this.store.tasks());

    const completed = all.filter(t => t.status === 'COMPLETED').length;
    const pending   = all.filter(t => t.status !== 'COMPLETED').length;
    const overdue   = all.filter(t => t.due && t.due < today && t.status !== 'COMPLETED').length;
    const total     = all.length;

    const createdInPeriod = all.filter(t => t.createdAt && t.createdAt.slice(0, 10) >= from).length;

    const byPriority: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const byStatus:   Record<string, number> = { ACTIVE: 0, COMPLETED: 0, PENDING: 0 };
    const projectMap = new Map<string, number>();

    for (const t of all) {
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      byStatus[t.status]     = (byStatus[t.status]     ?? 0) + 1;
      if (t.project) projectMap.set(t.project, (projectMap.get(t.project) ?? 0) + 1);
    }

    const topProjects = [...projectMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, overdue, completionRate, createdInPeriod, byPriority, byStatus, topProjects };
  }

  // ─── Notes ─────────────────────────────────────────────────────────────────

  private noteStats(from: string) {
    const all = this.store.notes();
    const tagMap = new Map<string, number>();

    let createdInPeriod = 0;
    let editedInPeriod  = 0;

    for (const n of all) {
      if (n.date >= from)                                     createdInPeriod++;
      if (n.lastEdited && n.lastEdited.slice(0, 10) >= from) editedInPeriod++;
      for (const tag of (n.tags ?? [])) tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }

    const topTags = [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));

    return { total: all.length, createdInPeriod, editedInPeriod, topTags };
  }

  // ─── Meetings ──────────────────────────────────────────────────────────────

  private meetingStats(from: string) {
    const all = this.meetings.meetings();
    const inPeriod = all.filter(m => m.date >= from && m.status !== 'cancelled');
    const byType: Record<string, number> = {};
    let totalMinutes = 0;

    for (const m of inPeriod) {
      totalMinutes += m.duration ?? 45;
      const t = m.meetingType ?? 'other';
      byType[t] = (byType[t] ?? 0) + 1;
    }

    const avgDuration = inPeriod.length ? Math.round(totalMinutes / inPeriod.length) : 0;

    return { total: all.length, inPeriod: inPeriod.length, totalMinutes, avgDuration, byType };
  }

  // ─── Writing ───────────────────────────────────────────────────────────────

  private writingStats() {
    const books = this.store.books().filter(b => b.status !== 'PUBLISHED');
    const totalWords  = books.reduce((s, b) => s + (b.wordCount ?? 0), 0);
    const totalTarget = books.reduce((s, b) => s + (b.targetWordCount ?? 0), 0);
    const overallProgress = totalTarget ? Math.round((totalWords / totalTarget) * 100) : 0;

    return {
      totalWords,
      totalTarget,
      overallProgress,
      books: books
        .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
        .slice(0, 4)
        .map(b => ({ title: b.title, wordCount: b.wordCount, targetWordCount: b.targetWordCount, progress: b.progress, status: b.status })),
    };
  }

  // ─── Bookmarks ─────────────────────────────────────────────────────────────

  private bookmarkStats(from: string) {
    const all = this.store.bookmarks();
    return {
      total: all.length,
      savedInPeriod: all.filter(b => b.createdAt >= from).length,
      totalVisits: all.reduce((s, b) => s + (b.visitCount ?? 0), 0),
    };
  }

  // ─── Daily bars ────────────────────────────────────────────────────────────

  private buildDailyBars(from: string, today: string, period: number): DayBar[] {
    const allTasks    = this.flattenTasks(this.store.tasks());
    const allNotes    = this.store.notes();
    const allMeetings = this.meetings.meetings();

    const bars: DayBar[] = [];
    const useShortLabel = period <= 14;

    const cur = new Date(from);
    cur.setDate(cur.getDate() + 1); // start day after "from" for inclusive period
    const end = new Date(today);
    end.setDate(end.getDate() + 1);

    while (cur <= end) {
      const d = cur.toISOString().split('T')[0];
      bars.push({
        date: d,
        label: useShortLabel
          ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][cur.getDay()]
          : String(cur.getDate()),
        tasks:    allTasks.filter(t => t.createdAt?.slice(0, 10) === d).length,
        notes:    allNotes.filter(n => n.date === d || n.lastEdited?.slice(0, 10) === d).length,
        meetings: allMeetings.filter(m => m.date === d).length,
        height: 0,
      });
      cur.setDate(cur.getDate() + 1);
    }

    // Scale heights relative to the max total activity per day
    const max = Math.max(1, ...bars.map(b => b.tasks + b.notes + b.meetings));
    for (const b of bars) {
      b.height = Math.round(((b.tasks + b.notes + b.meetings) / max) * 100);
    }

    return bars;
  }

  // ─── Productivity score (0–100) ────────────────────────────────────────────

  private productivityScore(
    tasks: AnalyticsStats['tasks'],
    notes: AnalyticsStats['notes'],
    meetings: AnalyticsStats['meetings'],
    writing: AnalyticsStats['writing'],
  ): number {
    // 40 pts: task completion rate
    const taskScore = tasks.completionRate * 0.4;

    // 25 pts: notes activity (capped at 1 note/day on avg = full score)
    const noteScore = Math.min(25, (notes.createdInPeriod + notes.editedInPeriod) * 2.5);

    // 20 pts: meeting engagement (3+ meetings in period = full score)
    const meetScore = Math.min(20, meetings.inPeriod * 6.7);

    // 15 pts: writing activity
    const writeScore = writing.books.length > 0
      ? Math.min(15, (writing.overallProgress / 100) * 15 + (writing.totalWords > 0 ? 5 : 0))
      : 0;

    return Math.min(100, Math.round(taskScore + noteScore + meetScore + writeScore));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private flattenTasks(tasks: Task[]): Task[] {
    const out: Task[] = [];
    for (const t of tasks) {
      out.push(t);
      if (t.subtasks?.length) out.push(...this.flattenTasks(t.subtasks as Task[]));
    }
    return out;
  }
}
