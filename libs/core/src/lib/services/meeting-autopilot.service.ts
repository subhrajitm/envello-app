import { Injectable, inject, signal } from '@angular/core';
import { AiService } from './ai.service';
import { StoreService } from './store.service';
import { MeetingsService, Meeting, ActionItem } from './meetings.service';
import { ContextService } from './context.service';
import { Task, Note } from '@envello/domain';

export interface AutopilotResult {
  summaryNote: Note;
  tasks: Task[];
  followUpMeeting: Partial<Meeting> | null;
  raw: string;
}

export type AutopilotStatus = 'idle' | 'running' | 'done' | 'error';

/**
 * Post-Meeting Autopilot: one click after a meeting generates a summary note,
 * action-item tasks, and an optional follow-up meeting draft — all from the
 * meeting's existing data (title, agenda, action items, notes, attendees).
 */
@Injectable({ providedIn: 'root' })
export class MeetingAutopilotService {
  private ai      = inject(AiService);
  private store   = inject(StoreService);
  private meetings = inject(MeetingsService);
  private context = inject(ContextService);

  status   = signal<AutopilotStatus>('idle');
  progress = signal<string>('');
  lastResult = signal<AutopilotResult | null>(null);

  async runForMeeting(meetingId: string): Promise<AutopilotResult | null> {
    const meeting = this.meetings.meetings().find(m => m.id === meetingId);
    if (!meeting) return null;

    this.status.set('running');
    this.progress.set('Building context…');
    this.lastResult.set(null);

    try {
      // Gather cross-module context for this meeting's topic / project
      const ctx = await this.context.buildContext(
        [meeting.title, meeting.project ?? ''].filter(Boolean).join(' '),
        3,
      );

      this.progress.set('Generating artifacts with AI…');

      const meetingPayload = this.serializeMeeting(meeting);
      const ctxSection = ctx.blocks.length
        ? `\n\nRelated context from the user's workspace:\n${ctx.formatted}`
        : '';

      const prompt = `You are a productivity assistant. Given the following meeting data, produce a JSON object with three keys:
1. "summary" – a concise summary paragraph (2-4 sentences) of what was discussed and decided.
2. "action_tasks" – an array of objects {title, priority ("HIGH"|"MEDIUM"|"LOW"), due (ISO date or null)} extracted from the action items and agenda. Create one task per distinct action item. Limit to 8.
3. "follow_up" – an object {title, date (ISO, 7-14 days from today), reason} if a follow-up meeting is warranted, or null otherwise.

Meeting data:
${meetingPayload}
${ctxSection}

Return ONLY the JSON object. No markdown fences.`;

      const raw = await this.ai.sendMessage(
        prompt,
        'You generate structured meeting artifacts. Return only valid JSON.',
      );

      this.progress.set('Saving artifacts…');

      const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as {
        summary: string;
        action_tasks: { title: string; priority: string; due: string | null }[];
        follow_up: { title: string; date: string; reason: string } | null;
      };

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // 1. Summary note
      const summaryNote: Note = {
        id: `note-autopilot-${meetingId}-${Date.now()}`,
        date: dateStr,
        title: `Meeting Summary: ${meeting.title}`,
        preview: parsed.summary.slice(0, 120),
        content: `<h2>Meeting Summary: ${meeting.title}</h2>
<p><strong>Date:</strong> ${meeting.date} · <strong>Attendees:</strong> ${meeting.attendees.map(a => a.name).join(', ') || 'None'}</p>
<p>${parsed.summary}</p>
${meeting.actionItems?.length ? `<h3>Action Items</h3><ul>${meeting.actionItems.map(a => `<li>${a.title}${a.assignee ? ` — ${a.assignee}` : ''}</li>`).join('')}</ul>` : ''}`,
        tags: ['meeting-summary', meeting.project ?? ''].filter(Boolean),
        lastEdited: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      await this.store.addNote(summaryNote);

      // 2. Tasks from action items
      const tasks: Task[] = parsed.action_tasks.map((at, i) => ({
        id: `task-autopilot-${meetingId}-${i}-${Date.now()}`,
        title: at.title,
        priority: (['HIGH', 'MEDIUM', 'LOW'].includes(at.priority) ? at.priority : 'MEDIUM') as Task['priority'],
        hours: '1.0H',
        status: 'ACTIVE' as const,
        due: at.due ?? undefined,
        project: meeting.project ?? undefined,
        createdAt: now.toISOString(),
        labels: ['from-meeting'],
      }));
      for (const t of tasks) this.store.addTask(t);

      // 3. Link action items in meeting → tasks
      if (tasks.length) {
        const updatedActions: ActionItem[] = tasks.map((t, i) => ({
          id: `ai-${meetingId}-${i}`,
          title: t.title,
          status: 'open' as const,
          priority: t.priority,
          linkedTaskId: t.id,
        }));
        this.meetings.updateMeeting(meetingId, {
          actionItems: [...(meeting.actionItems ?? []), ...updatedActions],
          status: 'completed',
        });
      } else {
        this.meetings.updateMeeting(meetingId, { status: 'completed' });
      }

      // 4. Follow-up meeting draft (add as scheduled)
      let followUpMeeting: Partial<Meeting> | null = null;
      if (parsed.follow_up) {
        const fu = parsed.follow_up;
        const created = this.meetings.addMeeting({
          title: fu.title,
          description: `Follow-up to: ${meeting.title}. ${fu.reason}`,
          date: fu.date,
          startTime: meeting.startTime,
          endTime: meeting.endTime ?? `${String((parseInt(meeting.startTime) + 1) % 24).padStart(2, '0')}:00`,
          duration: meeting.duration ?? 60,
          meetingType: meeting.meetingType,
          platform: meeting.platform,
          attendees: meeting.attendees,
          status: 'scheduled',
          color: meeting.color,
          project: meeting.project,
          labels: [...(meeting.labels ?? []), 'follow-up'],
        });
        followUpMeeting = created;
      }

      const result: AutopilotResult = { summaryNote, tasks, followUpMeeting, raw };
      this.lastResult.set(result);
      this.status.set('done');
      this.progress.set('Done');
      return result;

    } catch (e) {
      console.error('[MeetingAutopilot]', e);
      this.status.set('error');
      this.progress.set('AI could not process this meeting. Try again or check AI settings.');
      return null;
    }
  }

  reset() {
    this.status.set('idle');
    this.progress.set('');
    this.lastResult.set(null);
  }

  private serializeMeeting(m: Meeting): string {
    const lines: string[] = [
      `Title: ${m.title}`,
      `Date: ${m.date} ${m.startTime}–${m.endTime ?? ''}`,
      `Status: ${m.status}`,
    ];
    if (m.project)      lines.push(`Project: ${m.project}`);
    if (m.description)  lines.push(`Description: ${m.description}`);
    if (m.attendees.length) lines.push(`Attendees: ${m.attendees.map(a => a.name).join(', ')}`);
    if (m.agenda?.length) {
      lines.push('Agenda:');
      m.agenda.forEach(a => lines.push(`  - ${a.title}${a.notes ? `: ${a.notes}` : ''}`));
    }
    if (m.notes?.length) {
      lines.push('Notes:');
      m.notes.forEach(n => lines.push(`  - ${n.content}`));
    }
    if (m.actionItems?.length) {
      lines.push('Existing action items:');
      m.actionItems.forEach(a => lines.push(`  - [${a.status}] ${a.title}${a.assignee ? ` (${a.assignee})` : ''}`));
    }
    return lines.join('\n');
  }
}
