import { Injectable, inject, signal } from '@angular/core';
import { StoreService } from './store.service';
import { MeetingsService } from './meetings.service';
import { NotificationService } from './notification.service';
import { RelationshipService } from './relationship.service';
import { TransactionStore } from '@envello/state';
import { Task, Transaction } from '@envello/domain';

// ─── Rule definitions ──────────────────────────────────────────────────────────

export interface MonitorRule {
  id: MonitorRuleId;
  label: string;
  description: string;
  icon: string;
  defaultEnabled: boolean;
}

export type MonitorRuleId =
  | 'subscription-due'
  | 'trial-cancel'
  | 'overdue-tasks'
  | 'meeting-actions'
  | 'stale-contacts'
  | 'note-extraction';

export const MONITOR_RULES: MonitorRule[] = [
  {
    id: 'subscription-due',
    label: 'Upcoming payments',
    description: 'Creates a reminder task for subscriptions or bills due within 7 days',
    icon: 'credit_card',
    defaultEnabled: true,
  },
  {
    id: 'trial-cancel',
    label: 'Trial subscriptions',
    description: 'Flags free-trial or $0 subscriptions so you can cancel before being charged',
    icon: 'warning',
    defaultEnabled: true,
  },
  {
    id: 'overdue-tasks',
    label: 'Overdue task follow-ups',
    description: 'Creates a follow-up task when an active task is overdue by 3+ days',
    icon: 'schedule',
    defaultEnabled: true,
  },
  {
    id: 'meeting-actions',
    label: 'Meeting action items',
    description: 'Converts open action items from completed meetings into tasks',
    icon: 'calendar_month',
    defaultEnabled: true,
  },
  {
    id: 'stale-contacts',
    label: 'Stale contact check-ins',
    description: 'Reminds you to follow up with people you haven\'t contacted in 45+ days who have open tasks',
    icon: 'person',
    defaultEnabled: false,
  },
  {
    id: 'note-extraction',
    label: 'Task hints in notes',
    description: 'Extracts action items from notes that contain phrases like "need to", "remind me", "todo"',
    icon: 'edit_note',
    defaultEnabled: false,
  },
];

// ─── Result types ──────────────────────────────────────────────────────────────

export interface MonitorFinding {
  ruleId: MonitorRuleId;
  title: string;
  reason: string;
  taskId: string;
  priority: Task['priority'];
}

export interface MonitorDigest {
  findings: MonitorFinding[];
  skipped: number; // already created in prior runs
  ranAt: string;
}

const STORAGE_KEY     = 'envello-monitor-fingerprints';
const CONFIG_KEY      = 'envello-monitor-config';
const MAX_FINGERPRINTS = 500;

@Injectable({ providedIn: 'root' })
export class SmartMonitorService {
  private store       = inject(StoreService);
  private meetings    = inject(MeetingsService);
  private txStore     = inject(TransactionStore);
  private notify      = inject(NotificationService);
  private relService  = inject(RelationshipService);

  /** Whether the monitor is currently running. */
  running = signal(false);
  /** Last digest result, useful for displaying in settings. */
  lastDigest = signal<MonitorDigest | null>(null);
  /** Whether the monitor is enabled at all. Loaded from localStorage. */
  enabled = signal(this.loadEnabled());

  private config: Record<MonitorRuleId, boolean> = this.loadConfig();
  /** Fingerprints cached in memory — loaded once, written only when changed. */
  private fingerprints = this.loadFingerprints();
  /** Prevents the auto-trigger from running more than once per session. */
  private sessionRanAt = 0;

  // ─── Public API ───────────────────────────────────────────────────────────

  isRuleEnabled(id: MonitorRuleId): boolean {
    return this.config[id] ?? MONITOR_RULES.find(r => r.id === id)?.defaultEnabled ?? false;
  }

  setRuleEnabled(id: MonitorRuleId, value: boolean) {
    this.config[id] = value;
    this.saveConfig();
  }

  setEnabled(value: boolean) {
    this.enabled.set(value);
    try { localStorage.setItem('envello-monitor-enabled', String(value)); } catch { /* ignore */ }
  }

  /**
   * Main entry point.
   * @param manual - true when triggered from settings UI (bypasses session-once guard).
   *                 false (default) for automatic on-open runs — runs only once per session.
   */
  async run(manual = false): Promise<MonitorDigest> {
    const empty: MonitorDigest = { findings: [], skipped: 0, ranAt: new Date().toISOString() };
    if (this.running() || !this.enabled()) return empty;
    // Auto-runs fire at most once per session to prevent double-trigger.
    if (!manual && this.sessionRanAt > 0) return empty;
    if (!manual) this.sessionRanAt = Date.now();

    this.running.set(true);
    // Yield to Angular's change detection so the spinner actually renders.
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const findings: MonitorFinding[] = [];
    let skipped = 0;

    try {
      const checks: (() => MonitorFinding[])[] = [
        () => this.checkSubscriptionsDue(),
        () => this.checkTrialSubscriptions(),
        () => this.checkOverdueTasks(),
        () => this.checkMeetingActions(),
        () => this.checkStaleContacts(),
        () => this.checkNoteExtractions(),
      ];

      for (const check of checks) {
        let checkFindings: MonitorFinding[];
        try {
          checkFindings = check();
        } catch (e) {
          console.warn('[SmartMonitor] rule threw:', e);
          continue;
        }

        for (const finding of checkFindings) {
          const fp = this.fingerprint(finding);
          // Manual runs skip the fingerprint cache so the user always sees current state.
          if (!manual && this.fingerprints.has(fp)) { skipped++; continue; }
          this.createTask(finding);
          if (!manual) this.fingerprints.add(fp); // only persist fingerprints for auto-runs
          findings.push(finding);
          // For meeting action items, link the new task so it's never recreated.
          const f = finding as MonitorFinding & { _meetingId?: string; _actionId?: string };
          if (f._meetingId && f._actionId && finding.taskId) {
            this.linkMeetingAction(f._meetingId, f._actionId, finding.taskId);
          }
        }
      }

      if (!manual) this.saveFingerprints(this.fingerprints);

      // Always notify on manual runs so the user knows it ran.
      if (findings.length > 0) {
        this.notify.add({
          type: 'success',
          title: `${findings.length} task${findings.length !== 1 ? 's' : ''} created`,
          message: findings.slice(0, 3).map(f => `• ${f.title}`).join('\n')
            + (findings.length > 3 ? `\n• …and ${findings.length - 3} more` : ''),
          icon: 'bolt',
          isAi: true,
          link: '/tasks',
        });
      } else if (manual) {
        this.notify.add({
          type: 'info',
          title: 'All clear',
          message: skipped > 0
            ? `${skipped} item${skipped !== 1 ? 's' : ''} checked — no new tasks needed`
            : 'No actionable items found right now',
          icon: 'check_circle',
          isAi: true,
        });
      }

    } catch (e) {
      console.error('[SmartMonitor] run failed:', e);
      if (manual) {
        this.notify.add({
          type: 'error',
          title: 'Smart Monitor failed',
          message: String((e as Error)?.message ?? e),
          icon: 'error',
          isAi: true,
        });
      }
    } finally {
      this.running.set(false);
    }

    const digest: MonitorDigest = { findings, skipped, ranAt: new Date().toISOString() };
    this.lastDigest.set(digest);
    return digest;
  }

  // ─── Rules ────────────────────────────────────────────────────────────────

  private checkSubscriptionsDue(): MonitorFinding[] {
    if (!this.isRuleEnabled('subscription-due')) return [];
    const findings: MonitorFinding[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7   = new Date(today); in7.setDate(today.getDate() + 7);

    for (const tx of this.txStore.transactions()) {
      if (tx.status === 'cancelled' || tx.status === 'paused') continue;
      if (tx.type !== 'recurring' && tx.type !== 'bill') continue;
      const due = new Date(tx.date);
      if (due < today || due > in7) continue;

      const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
      const label = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
      findings.push({
        ruleId: 'subscription-due',
        title: `Pay ${tx.name} (${this.formatAmount(tx)} due ${label})`,
        reason: `${tx.name} payment is due ${label}`,
        taskId: '',
        priority: daysUntil <= 1 ? 'HIGH' : 'MEDIUM',
      });
    }
    return findings;
  }

  private checkTrialSubscriptions(): MonitorFinding[] {
    if (!this.isRuleEnabled('trial-cancel')) return [];
    const TRIAL_KEYWORDS = /\b(trial|free|beta|test|demo|promo|pilot)\b/i;
    const findings: MonitorFinding[] = [];

    for (const tx of this.txStore.transactions()) {
      if (tx.status === 'cancelled' || tx.status === 'paused') continue;
      if (!TRIAL_KEYWORDS.test(tx.name)) continue;

      findings.push({
        ruleId: 'trial-cancel',
        title: `Review trial: ${tx.name} — cancel if not using`,
        reason: `"${tx.name}" looks like a trial subscription`,
        taskId: '',
        priority: 'MEDIUM',
      });
    }
    return findings;
  }

  private checkOverdueTasks(): MonitorFinding[] {
    if (!this.isRuleEnabled('overdue-tasks')) return [];
    const findings: MonitorFinding[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const OVERDUE_DAYS = 3;

    for (const task of this.store.tasks()) {
      if (task.status !== 'ACTIVE' || !task.due) continue;
      const due = new Date(task.due);
      const daysOver = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
      if (daysOver < OVERDUE_DAYS) continue;
      // Skip tasks that already have a follow-up (label check)
      if (task.labels?.includes('follow-up')) continue;

      findings.push({
        ruleId: 'overdue-tasks',
        title: `Follow up: "${task.title}" (${daysOver}d overdue)`,
        reason: `Task "${task.title}" is ${daysOver} days past its due date`,
        taskId: '',
        priority: daysOver >= 7 ? 'HIGH' : 'MEDIUM',
      });
    }
    return findings;
  }

  private checkMeetingActions(): MonitorFinding[] {
    if (!this.isRuleEnabled('meeting-actions')) return [];
    const findings: MonitorFinding[] = [];
    const existingTitles = new Set(this.store.tasks().map(t => t.title.toLowerCase()));

    for (const meeting of this.meetings.meetings()) {
      if (meeting.status !== 'completed') continue;
      for (const action of (meeting.actionItems ?? [])) {
        if (action.status === 'completed') continue;
        if (action.linkedTaskId) continue; // already linked to a task
        const title = `[${meeting.title}] ${action.title}`;
        if (existingTitles.has(title.toLowerCase())) continue;

        findings.push({
          ruleId: 'meeting-actions',
          title,
          reason: `Open action item from meeting: "${meeting.title}"`,
          taskId: '',
          priority: action.priority ?? 'MEDIUM',
          // Store meetingId + actionId so we can link after task creation
          _meetingId: meeting.id,
          _actionId: action.id,
        } as MonitorFinding & { _meetingId: string; _actionId: string });
      }
    }
    return findings;
  }

  private checkStaleContacts(): MonitorFinding[] {
    if (!this.isRuleEnabled('stale-contacts')) return [];
    const findings: MonitorFinding[] = [];
    const today = new Date();
    const STALE_DAYS = 45;

    for (const profile of this.relService.peopleWithStats()) {
      if (profile.openTasks === 0) continue;
      if (!profile.lastSeen) continue;
      const daysSince = Math.floor((today.getTime() - new Date(profile.lastSeen).getTime()) / 86_400_000);
      if (daysSince < STALE_DAYS) continue;

      findings.push({
        ruleId: 'stale-contacts',
        title: `Check in with ${profile.person.name} (${daysSince}d since last contact)`,
        reason: `${profile.person.name} has ${profile.openTasks} open task(s) and you haven't interacted in ${daysSince} days`,
        taskId: '',
        priority: 'LOW',
      });
    }
    return findings;
  }

  private checkNoteExtractions(): MonitorFinding[] {
    if (!this.isRuleEnabled('note-extraction')) return [];
    const HINT_RE = /\b(need to|remind me to|don't forget to|todo:|remember to|must|should)\s+(.{5,60})/gi;
    const findings: MonitorFinding[] = [];
    const existingTitles = new Set(this.store.tasks().map(t => t.title.toLowerCase()));

    // Only look at notes from the last 7 days
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);

    for (const note of this.store.notes()) {
      if (!note.preview) continue;
      // Apply the 7-day cutoff using the note's date field
      if (note.date && new Date(note.date) < cutoff) continue;
      const matches = [...note.preview.matchAll(HINT_RE)];
      for (const match of matches.slice(0, 2)) { // max 2 extractions per note
        const extracted = match[2].trim().replace(/[.!?,;]+$/, '');
        if (existingTitles.has(extracted.toLowerCase())) continue;

        findings.push({
          ruleId: 'note-extraction',
          title: extracted.charAt(0).toUpperCase() + extracted.slice(1),
          reason: `Extracted from note: "${note.title}"`,
          taskId: '',
          priority: 'MEDIUM',
        });
      }
    }
    return findings;
  }

  // ─── Task creation ─────────────────────────────────────────────────────────

  private linkMeetingAction(meetingId: string, actionId: string, taskId: string) {
    const meeting = this.meetings.meetings().find(m => m.id === meetingId);
    if (!meeting) return;
    const updatedActions = (meeting.actionItems ?? []).map(a =>
      a.id === actionId ? { ...a, linkedTaskId: taskId } : a
    );
    this.meetings.updateMeeting(meetingId, { actionItems: updatedActions });
  }

  private createTask(finding: MonitorFinding) {
    const task: Task = {
      id: `monitor-${crypto.randomUUID()}`,
      title: finding.title,
      priority: finding.priority,
      hours: '0.5H',
      status: 'ACTIVE',
      labels: ['⚡ monitor', finding.ruleId],
      notes: finding.reason,
      createdAt: new Date().toISOString(),
    };
    finding.taskId = task.id;
    this.store.addTask(task);
  }

  // ─── Fingerprinting (dedup) ────────────────────────────────────────────────

  private fingerprint(finding: MonitorFinding): string {
    // Weekly window for most rules; daily for high-priority subscription due
    const window = finding.priority === 'HIGH' ? this.dayNumber() : this.weekNumber();
    return `${finding.ruleId}:${this.slug(finding.title)}:${window}`;
  }

  private slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 60);
  }

  private weekNumber(): number {
    return Math.floor(Date.now() / (7 * 86_400_000));
  }

  private dayNumber(): number {
    return Math.floor(Date.now() / 86_400_000);
  }

  // ─── Persistence ───────────────────────────────────────────────────────────

  private loadFingerprints(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  }

  private saveFingerprints(set: Set<string>) {
    try {
      const arr = [...set].slice(-MAX_FINGERPRINTS);
      // Keep the in-memory Set capped too so it never grows beyond MAX_FINGERPRINTS
      if (set.size > MAX_FINGERPRINTS) {
        set.clear();
        arr.forEach(fp => set.add(fp));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch { /* ignore */ }
  }

  private loadConfig(): Record<MonitorRuleId, boolean> {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      const defaults = Object.fromEntries(MONITOR_RULES.map(r => [r.id, r.defaultEnabled]));
      return { ...defaults, ...saved } as Record<MonitorRuleId, boolean>;
    } catch {
      return Object.fromEntries(MONITOR_RULES.map(r => [r.id, r.defaultEnabled])) as Record<MonitorRuleId, boolean>;
    }
  }

  private saveConfig() {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config)); } catch { /* ignore */ }
  }

  private loadEnabled(): boolean {
    try { return localStorage.getItem('envello-monitor-enabled') !== 'false'; } catch { return true; }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private formatAmount(tx: Transaction): string {
    const sym = tx.currency === 'USD' ? '$' : (tx.currency ?? '$');
    return `${sym}${tx.amount.toFixed(2)}`;
  }
}
