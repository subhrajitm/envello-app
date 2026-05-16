import { Component, computed, inject, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  StoreService, UserService, NotificationService,
  AiService, MeetingsService, ResearchService,
  type Task, type Note, type Novel, type Bookmark, type WritingType,
} from '@envello/core';

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface ParsedIntent {
  type: 'task' | 'note' | 'bookmark' | 'write' | 'meeting' | 'navigate' | 'unknown';
  title: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  due?: string;
  time?: string;
  url?: string;
  tags?: string[];
  description?: string;
  writingType?: WritingType;
  route?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

/** Shape returned by the conversational AI call */
interface AiTurn {
  /** execute → create now; ask → need more info; confirm → show summary for yes/no; cancel → abort */
  action: 'execute' | 'ask' | 'confirm' | 'cancel';
  intent?: ParsedIntent;
  question?: string;
  summary?: string;          // used with action:"confirm"
  partialData?: Partial<ParsedIntent>;
  reason?: string;           // used with action:"cancel"
}

interface CreatedItem {
  type: string;
  title: string;
  route: string;
  id?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent {
  store               = inject(StoreService);
  router              = inject(Router);
  userService         = inject(UserService);
  notificationService = inject(NotificationService);
  aiService           = inject(AiService);
  meetingsService     = inject(MeetingsService);
  researchService     = inject(ResearchService);

  // ── Core UI state ────────────────────────────────────────────────────────────
  inputText      = signal('');
  listening      = signal(false);
  liveTranscript = signal('');
  confidence     = signal(0);
  isProcessing   = signal(false);
  lastCreated    = signal<CreatedItem | null>(null);

  attachments  = signal<string[]>([]);
  cpuUsage     = signal(12);
  latency      = signal(24);
  systemTime   = signal(new Date());

  // ── Conversation state ───────────────────────────────────────────────────────
  /** Ordered list of turns shown in the conversation thread */
  conversationHistory = signal<ConversationMessage[]>([]);
  /** Whether the AI has asked a question and is awaiting the user's reply */
  conversationState   = signal<'idle' | 'awaiting-answer' | 'awaiting-confirm'>('idle');
  /** Partial intent data accumulated across turns */
  partialData         = signal<Partial<ParsedIntent> | null>(null);
  /** The pending intent shown to the user for confirmation */
  pendingIntent       = signal<ParsedIntent | null>(null);

  // ── Quick-action chips ───────────────────────────────────────────────────────
  readonly examples: { label: string; icon: string; text: string }[] = [
    { label: 'Task',     icon: 'checklist', text: 'Add task: Review PR by tomorrow, high priority' },
    { label: 'Note',     icon: 'edit_note', text: 'Note: Key decisions from today\'s retro' },
    { label: 'Meeting',  icon: 'groups',    text: 'Schedule meeting: Sprint planning on Friday at 10am' },
    { label: 'Bookmark', icon: 'bookmark',  text: 'Bookmark: https://example.com as My Reference' },
    { label: 'Write',    icon: 'menu_book', text: 'New novel: The Last Kingdom – dark fantasy' },
  ];

  // ── Computed helpers ──────────────────────────────────────────────────────────
  isInConversation = computed(() => this.conversationState() !== 'idle');

  inputPlaceholder = computed(() => {
    if (this.listening())                              return `Listening (${this.liveTranscript()})…`;
    if (this.isProcessing())                           return 'Processing…';
    if (this.conversationState() === 'awaiting-confirm') return 'Type "yes" to confirm or "no" to cancel…';
    if (this.conversationState() === 'awaiting-answer')  return 'Type your answer…';
    return 'Type a command or describe what to create…  (⌘K)';
  });

  // ── Today at a Glance ────────────────────────────────────────────────────────

  /** ISO date string for today, recomputed every minute via systemTime */
  private todayStr = computed(() => this.systemTime().toISOString().split('T')[0]);

  overdueTasks = computed(() =>
    this.store.tasks()
      .filter(t => t.status !== 'COMPLETED' && t.due && t.due < this.todayStr())
      .sort((a, b) => (a.due || '').localeCompare(b.due || ''))
      .slice(0, 4)
  );

  dueTodayTasks = computed(() =>
    this.store.tasks()
      .filter(t => t.status !== 'COMPLETED' && t.due === this.todayStr())
      .sort((a, b) => {
        const p = { HIGH: 0, MEDIUM: 1, LOW: 2 } as Record<string, number>;
        return p[a.priority] - p[b.priority];
      })
      .slice(0, 4)
  );

  nextMeeting = computed(() => {
    const now = this.systemTime();
    return this.meetingsService.meetings()
      .filter(m => new Date(`${m.date}T${m.startTime}`) >= now && m.status === 'scheduled')
      .sort((a, b) =>
        new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
      )[0] ?? null;
  });

  meetingCountdown = computed(() => {
    const m = this.nextMeeting();
    if (!m) return null;
    const diffMs = new Date(`${m.date}T${m.startTime}`).getTime() - this.systemTime().getTime();
    if (diffMs <= 0) return 'Now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `in ${mins}m`;
    const h = Math.floor(mins / 60), rem = mins % 60;
    return rem > 0 ? `in ${h}h ${rem}m` : `in ${h}h`;
  });

  lastNote = computed(() =>
    [...this.store.notes()]
      .sort((a, b) => (b.lastEdited || b.date).localeCompare(a.lastEdited || a.date))[0] ?? null
  );

  activeWriting = computed(() => {
    const novels = this.store.novels();
    return (
      novels.filter(n => n.status === 'DRAFTING' || n.status === 'REVISING')
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
      ?? [...novels].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))[0]
      ?? null
    );
  });

  linkedEntities = computed(() => ({
    tasks: this.store.tasks().filter(t => t.status !== 'COMPLETED').length,
  }));

  userName = computed(() => this.userService.userName());

  // ── Voice ───────────────────────────────────────────────────────────────────
  private recognition: any;
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      this.initSpeechRecognition();
      setInterval(() => this.systemTime.set(new Date()), 60000);
      this.updatePerformanceMetrics();
      setInterval(() => this.updatePerformanceMetrics(), 5000);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      (document.querySelector('.main-text-input') as HTMLInputElement)?.focus();
    }
    if (event.key === 'Escape') this.clearCommand();
  }

  private updatePerformanceMetrics() {
    if (typeof performance === 'undefined') return;
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (nav) this.latency.set(Math.min(Math.round(nav.responseEnd - nav.requestStart), 100));
    const t0 = performance.now();
    let s = 0; for (let i = 0; i < 1000; i++) s += Math.sqrt(i);
    this.cpuUsage.set(Math.min(Math.round((performance.now() - t0) * 10), 50) || 5);
  }

  private initSpeechRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    this.recognition = new SR();
    this.recognition.continuous     = true;
    this.recognition.interimResults = true;
    this.recognition.lang           = 'en-US';
    this.recognition.onstart = () => { this.listening.set(true); this.confidence.set(0); };
    this.recognition.onend   = () => this.listening.set(false);
    this.recognition.onerror = () => this.listening.set(false);
    this.recognition.onresult = (event: any) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
          this.confidence.set(Math.round(event.results[i][0].confidence * 100));
        } else { interim += event.results[i][0].transcript; }
      }
      if (final) { this.inputText.update(t => (t ? t + ' ' : '') + final); this.liveTranscript.set(''); }
      else if (interim) { this.liveTranscript.set(interim); }
    };
  }

  toggleVoice() {
    if (!this.recognition) return;
    this.listening() ? this.recognition.stop() : this.recognition.start();
  }

  // ── Command entry point ───────────────────────────────────────────────────────

  async executeCommand() {
    const raw = this.inputText().trim();
    if (!raw || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.lastCreated.set(null);

    // Append user turn to conversation history
    this.conversationHistory.update(h => [...h, { role: 'user', text: raw }]);

    try {
      const state = this.conversationState();

      if (state === 'awaiting-confirm') {
        await this.handleConfirmationReply(raw);

      } else if (state === 'awaiting-answer') {
        await this.handleFollowUpReply(raw);

      } else {
        // Fresh command
        const lower = raw.toLowerCase();

        // Navigation is always instant — no conversation needed
        if (/^(go to|open|navigate to|show)\s/i.test(lower)) {
          const intent = this.parseNavigation(lower);
          this.doNavigate(intent);
          this.clearConversation();
          return;
        }

        // Try fast pattern match (only when title is clearly present)
        const quick = this.quickPatternMatch(lower, raw);
        if (quick) {
          await this.executeIntent(quick, raw);
          this.clearConversation();
        } else {
          // Fall through to AI-driven conversation
          await this.dispatchToAi();
        }
      }
    } finally {
      this.isProcessing.set(false);
      this.inputText.set('');
      this.liveTranscript.set('');
      this.attachments.set([]);
    }
  }

  // ── Conversation handlers ────────────────────────────────────────────────────

  /**
   * User replied to an AI question (awaiting-answer state).
   * Merge the answer into the context and call AI again.
   */
  private async handleFollowUpReply(reply: string) {
    await this.dispatchToAi();
  }

  /**
   * User replied to a confirmation prompt (yes / no).
   * "yes" / "ok" / "sure" / "yep" → execute pending intent.
   * "no" / "cancel" / "stop" → cancel and clear.
   * Anything else → ask AI to re-evaluate.
   */
  private async handleConfirmationReply(reply: string) {
    const lower = reply.toLowerCase().trim();

    if (/^(yes|yeah|yep|ok|okay|sure|confirm|go ahead|do it|create it|looks good|correct|right|proceed)/.test(lower)) {
      const intent = this.pendingIntent();
      if (intent) {
        await this.executeIntent(intent, reply);
      }
      this.clearConversation();

    } else if (/^(no|nope|cancel|stop|abort|never mind|don't|dont|skip)/.test(lower)) {
      this.conversationHistory.update(h => [...h, { role: 'assistant', text: 'Got it, cancelled.' }]);
      this.conversationState.set('idle');
      this.pendingIntent.set(null);

    } else {
      // Ambiguous — treat as refinement and re-ask AI
      await this.dispatchToAi();
    }
  }

  /**
   * Core: call AI with full conversation history.
   * AI can respond with: execute, ask, confirm, or cancel.
   */
  private async dispatchToAi() {
    const turn = await this.callConversationalAi();

    if (turn.action === 'execute' && turn.intent) {
      // Optionally merge any partial data we were carrying
      const merged: ParsedIntent = { ...this.partialData() as ParsedIntent, ...turn.intent };
      await this.executeIntent(merged, '');
      this.clearConversation();

    } else if (turn.action === 'confirm' && turn.intent) {
      // Show a confirmation with a human-readable summary
      const summary = turn.summary || this.buildSummary(turn.intent);
      this.pendingIntent.set(turn.intent);
      this.partialData.set(null);
      this.conversationHistory.update(h => [...h, { role: 'assistant', text: summary }]);
      this.conversationState.set('awaiting-confirm');

    } else if (turn.action === 'ask' && turn.question) {
      // Persist partial data and ask the question
      if (turn.partialData) this.partialData.set({ ...this.partialData(), ...turn.partialData });
      this.conversationHistory.update(h => [...h, { role: 'assistant', text: turn.question! }]);
      this.conversationState.set('awaiting-answer');

    } else if (turn.action === 'cancel') {
      const msg = turn.reason || 'Understood, nothing was created.';
      this.conversationHistory.update(h => [...h, { role: 'assistant', text: msg }]);
      this.conversationState.set('idle');
      this.pendingIntent.set(null);
    }
  }

  /** Call AiService with the full conversation transcript embedded in the system prompt */
  private async callConversationalAi(): Promise<AiTurn> {
    const today     = new Date().toISOString().split('T')[0];
    const history   = this.conversationHistory()
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');
    const partial   = this.partialData();

    const systemPrompt = `You are a productivity assistant embedded in a personal workspace app.
The app supports: tasks, notes, meetings, bookmarks, writing projects (novel/article/essay/script/poem/blog/research), and navigation. Spaces/projects cannot be created here — redirect the user to /spaces if they ask.

Today's date: ${today}
${partial ? `\nData collected so far: ${JSON.stringify(partial)}` : ''}

CONVERSATION SO FAR:
${history}

Based on the conversation, decide what to do and respond with ONLY valid JSON — no markdown, no explanation.

Choose ONE of these response shapes:

1. You have ALL necessary info → create immediately:
{"action":"execute","intent":{"type":"task|note|bookmark|write|meeting|navigate","title":"string","priority":"HIGH|MEDIUM|LOW","due":"YYYY-MM-DD or null","time":"HH:mm or null","url":"string or null","description":"string or null","writingType":"NOVEL|SHORT_STORY|ARTICLE|ESSAY|SCRIPT|POETRY|BLOG_POST|RESEARCH or null","route":"string or null"}}

2. Need ONE critical piece of missing info → ask a single focused question:
{"action":"ask","question":"One concise question?","partialData":{"type":"...","title":"..."}}

3. You have enough info but want the user to confirm a non-trivial action → show a summary:
{"action":"confirm","summary":"I'll create a [type] called \"[title]\" [with details]. Shall I go ahead?","intent":{...complete intent...}}

4. User clearly wants to stop → cancel gracefully:
{"action":"cancel","reason":"No problem, nothing was created."}

Rules:
- Ask at most ONE question per turn — never ask multiple things at once.
- Use sensible defaults rather than asking (priority: MEDIUM, time: 09:00, writingType: NOVEL).
- Only request "confirm" for meetings or writing projects — never for simple tasks or notes.
- If the user says "yes", "ok", "sure", "looks good" in response to a confirm → execute.
- If the user says "no", "cancel", "never mind" → cancel.
- If input is completely ambiguous with no recognisable intent → ask "What would you like to create?".
- If user asks to create a space or project → respond with {"action":"navigate","intent":{"type":"navigate","title":"spaces","route":"/spaces"}} and do NOT attempt to create it.`;

    try {
      const raw     = await this.aiService.sendMessage(
        'Respond based on the conversation above.',
        systemPrompt
      );
      const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
      const parsed  = JSON.parse(cleaned);
      // Validate shape
      if (!parsed.action) throw new Error('no action');
      return parsed as AiTurn;
    } catch {
      // Mock / parse failure — best-effort fallback
      return this.localFallbackTurn();
    }
  }

  /**
   * When AI is unavailable (mock provider / parse error), apply simple local logic.
   * Uses partial data + the last user message to attempt execution.
   */
  private localFallbackTurn(): AiTurn {
    const partial  = this.partialData();
    const messages = this.conversationHistory().filter(m => m.role === 'user');
    const lastUser = messages[messages.length - 1]?.text || '';

    // If we already know the type and have a title → execute
    if (partial?.type && (partial.title || lastUser)) {
      const intent: ParsedIntent = {
        type:     partial.type as ParsedIntent['type'],
        title:    partial.title || lastUser.substring(0, 120),
        priority: (partial.priority as ParsedIntent['priority']) || 'MEDIUM',
        due:      partial.due,
        time:     partial.time,
        url:      partial.url,
        writingType: partial.writingType,
        route:    partial.route,
      };
      return { action: 'execute', intent };
    }

    // Try to extract type from the last user message
    const lower   = lastUser.toLowerCase();
    const type    = this.guessTypeFromText(lower);
    if (type !== 'unknown') {
      return {
        action: 'execute',
        intent: { type, title: lastUser.substring(0, 120), priority: 'MEDIUM' },
      };
    }

    // Completely unknown — ask for type
    return { action: 'ask', question: 'What would you like to create? (task, note, meeting, bookmark, writing project, or space)' };
  }

  /** Lightweight type guesser used in the mock fallback */
  private guessTypeFromText(lower: string): ParsedIntent['type'] {
    if (/\b(task|todo|remind|deadline)\b/.test(lower))          return 'task';
    if (/\b(note|journal|jot|write down)\b/.test(lower))        return 'note';
    if (/\b(meeting|schedule|standup|sync|call)\b/.test(lower)) return 'meeting';
    if (/\b(bookmark|save|link|url)\b/.test(lower))             return 'bookmark';
    if (/\b(novel|story|article|essay|poem|blog|script)\b/.test(lower)) return 'write';
    return 'unknown';
  }

  /** Build a human-readable confirmation summary from an intent */
  private buildSummary(intent: ParsedIntent): string {
    const parts: string[] = [`I'll create a ${intent.type} called "${intent.title}"`];
    if (intent.due)         parts.push(`due ${intent.due}`);
    if (intent.time)        parts.push(`at ${intent.time}`);
    if (intent.priority)    parts.push(`(${intent.priority} priority)`);
    if (intent.writingType) parts.push(`[${intent.writingType.replace('_', ' ')}]`);
    return parts.join(', ') + '. Shall I go ahead?';
  }

  clearConversation() {
    this.conversationHistory.set([]);
    this.conversationState.set('idle');
    this.partialData.set(null);
    this.pendingIntent.set(null);
  }

  // ── Intent parsing ───────────────────────────────────────────────────────────

  private parseNavigation(lower: string): ParsedIntent {
    const target = lower.replace(/^(go to|open|navigate to|show)\s+/i, '').trim();
    const navMap: Record<string, string> = {
      'task': '/tasks', 'tasks': '/tasks', 'todos': '/tasks',
      'note': '/daily-notes', 'notes': '/daily-notes', 'daily': '/daily-notes', 'journal': '/daily-notes',
      'meeting': '/meetings', 'meetings': '/meetings', 'calendar': '/meetings',
      'research': '/research',
      'write': '/write', 'writing': '/write', 'novel': '/write', 'novels': '/write',
      'bookmark': '/bookmarks', 'bookmarks': '/bookmarks',
      'vault': '/vault', 'password': '/vault', 'passwords': '/vault',
      'workspace': '/workspace', 'dashboard': '/workspace',
      'space': '/spaces', 'spaces': '/spaces', 'project': '/spaces', 'projects': '/spaces',
      'activity': '/activity-log', 'log': '/activity-log', 'logs': '/activity-log',
      'bin': '/bin', 'trash': '/bin',
      'settings': '/developer-settings',
    };
    const key = Object.keys(navMap).find(k => target.includes(k));
    return { type: 'navigate', title: target, route: key ? navMap[key] : undefined };
  }

  /**
   * Fast regex matching — returns null when title is empty so the AI conversation
   * path is triggered instead (e.g. user types just "add task" with nothing after).
   */
  private quickPatternMatch(lower: string, raw: string): ParsedIntent | null {
    // ── TASK ────────────────────────────────────────────────────────────────────
    if (/^(add task|create task|new task|task:|remind me to|remind me|todo:|to-do:)/i.test(lower)) {
      const title = raw.replace(/^(add task|create task|new task|task:|remind me to|remind me|todo:|to-do:)\s*/i, '').trim();
      if (!title) return null; // trigger conversation
      return { type: 'task', title, priority: this.extractPriority(lower), due: this.extractDate(lower) };
    }

    // ── NOTE ────────────────────────────────────────────────────────────────────
    if (/^(note:|notes:|add note|create note|journal:|jot down|write down)/i.test(lower)) {
      const body = raw.replace(/^(note:|notes:|add note|create note|journal:|jot down|write down)\s*/i, '').trim();
      if (!body) return null;
      return { type: 'note', title: body.split(/[.!?\n]/)[0].substring(0, 80), description: body, tags: this.extractHashTags(lower) };
    }

    // ── BOOKMARK ────────────────────────────────────────────────────────────────
    if (/^(bookmark|save link|save url|add bookmark)/i.test(lower) || /https?:\/\//i.test(lower)) {
      const urlMatch  = raw.match(/https?:\/\/[^\s]+/i);
      const url       = urlMatch?.[0] ?? '';
      const nameMatch = raw.match(/(?:\bas\b|named?|called?)\s+["']?(.+?)["']?\s*$/i);
      let title       = nameMatch?.[1]?.trim() || '';
      if (!title && url) { try { title = new URL(url).hostname; } catch { title = url.substring(0, 60); } }
      title = title || raw.replace(/^(bookmark|save link|save url|add bookmark):?\s*/i, '').trim().substring(0, 80);
      if (!title && !url) return null;
      return { type: 'bookmark', title, url };
    }

    // ── MEETING ─────────────────────────────────────────────────────────────────
    if (/^(schedule(?: a)? meeting|meeting:|new meeting|create meeting|standup|sync with|call with|video call)/i.test(lower)) {
      const stripped  = raw.replace(/^(schedule(?: a)? meeting|meeting:|new meeting|create meeting|standup|sync with|call with|video call):?\s*/i, '');
      const titlePart = stripped.split(/\s+(?:on|at)\s+/i)[0].trim();
      if (!titlePart) return null; // ask AI
      return { type: 'meeting', title: titlePart, due: this.extractDate(lower), time: this.extractTime(lower), priority: this.extractPriority(lower) };
    }

    // ── WRITING ─────────────────────────────────────────────────────────────────
    if (/^(new novel|new story|new book|new article|new essay|new script|new poem|new blog|new blog post|start writing|create novel|write:)/i.test(lower)) {
      const stripped = raw.replace(/^(new novel|new story|new book|new article|new essay|new script|new poem|new blog|new blog post|start writing|create novel|write:)\s*/i, '').trim();
      const title    = stripped.split(/\s*[-–:]\s*/)[0].trim();
      if (!title) return null;
      return { type: 'write', title, writingType: this.extractWritingType(lower) };
    }

    // ── SPACE — not allowed; redirect to /spaces ─────────────────────────────────
    if (/^(new project|new space|create project|create space|space:|project:)/i.test(lower)) {
      return { type: 'navigate', title: 'spaces', route: '/spaces' };
    }

    return null;
  }

  // ── Intent execution ──────────────────────────────────────────────────────────

  private async executeIntent(intent: ParsedIntent, raw: string) {
    switch (intent.type) {
      case 'navigate': this.doNavigate(intent);               break;
      case 'task':     this.createTask(intent);               break;
      case 'note':     await this.createNote(intent);         break;
      case 'bookmark': this.createBookmark(intent);           break;
      case 'write':    this.createWriting(intent);            break;
      case 'meeting':  this.createMeeting(intent);            break;
      default:
        this.createTask({ type: 'task', title: raw.substring(0, 120) || intent.title, priority: 'MEDIUM' });
    }
  }

  private doNavigate(intent: ParsedIntent) {
    if (intent.route) this.router.navigate([intent.route]);
  }

  private createTask(intent: ParsedIntent) {
    const task: Task = {
      id:       crypto.randomUUID(),
      title:    intent.title || 'Untitled Task',
      priority: intent.priority || 'MEDIUM',
      hours:    '0',
      status:   'ACTIVE',
      project:  '',
      due:      intent.due || undefined,
      notes:    intent.description || undefined,
    };
    this.store.addTask(task);
    this.lastCreated.set({ type: 'Task', title: task.title, route: '/tasks', id: task.id });
  }

  private async createNote(intent: ParsedIntent) {
    const now  = new Date();
    const note: Note = {
      id:         crypto.randomUUID(),
      date:       now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title:      intent.title || 'Quick Note',
      preview:    (intent.description ?? '').substring(0, 100),
      content:    intent.description ? `<p>${intent.description}</p>` : '',
      tags:       intent.tags,
      lastEdited: 'Just now',
    };
    await this.store.addNote(note);
    this.lastCreated.set({ type: 'Note', title: note.title, route: '/daily-notes', id: note.id });
  }

  private createBookmark(intent: ParsedIntent) {
    const bm: Bookmark = {
      id:          crypto.randomUUID(),
      title:       intent.title || 'Untitled Bookmark',
      url:         intent.url  || '',
      description: intent.description || '',
      tags:        intent.tags || [],
      isPinned:    false,
      isArchived:  false,
      createdAt:   new Date().toISOString(),
      visitCount:  0,
    };
    this.store.addBookmark(bm);
    this.lastCreated.set({ type: 'Bookmark', title: bm.title, route: '/bookmarks', id: bm.id });
  }

  private createWriting(intent: ParsedIntent) {
    const id  = crypto.randomUUID();
    const now = new Date();
    const wt: WritingType = intent.writingType || 'NOVEL';
    const defaultWords: Record<WritingType, number> = {
      NOVEL: 80000, SHORT_STORY: 10000, ARTICLE: 2000, ESSAY: 3000,
      SCRIPT: 15000, POETRY: 500, BLOG_POST: 1500, RESEARCH: 5000,
    };
    const iconMap: Record<WritingType, string> = {
      NOVEL: 'menu_book', SHORT_STORY: 'auto_stories', ARTICLE: 'article',
      ESSAY: 'psychology', SCRIPT: 'description', POETRY: 'draw',
      BLOG_POST: 'edit_note', RESEARCH: 'science',
    };
    const novel: Novel = {
      id, title: intent.title || 'Untitled', icon: iconMap[wt], status: 'PLANNING',
      writingType: wt, wordCount: 0, targetWordCount: defaultWords[wt], progress: 0,
      chapters: 0, notesCount: 0,
      createdDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastUpdated: 'Just now', createdAt: now.toISOString(), genre: ['Fiction'], isRecentlyUpdated: true,
    };
    this.store.addNovel(novel);
    this.lastCreated.set({ type: 'Writing', title: novel.title, route: `/write/${id}`, id });
    this.router.navigate(['/write', id]);
  }

  private createMeeting(intent: ParsedIntent) {
    const date      = intent.due  || new Date().toISOString().split('T')[0];
    const startTime = intent.time || '09:00';
    this.meetingsService.addMeeting({
      title:       intent.title || 'New Meeting',
      description: intent.description || '',
      date,
      startTime,
      endTime:     this.addOneHour(startTime),
      duration:    60,
      status:      'scheduled',
      meetingType: 'video',
      platform:    'zoom',
      meetingLink: '',
      attendees:   [],
      agenda:      [],
      priority:    intent.priority || 'MEDIUM',
      color:       '#3b82f6',
      labels:      [],
      reminders:   [{ time: 15, type: 'notification', sent: false }],
    });
    this.lastCreated.set({ type: 'Meeting', title: intent.title || 'New Meeting', route: '/meetings' });
  }

  // ── Field extractors ──────────────────────────────────────────────────────────

  private extractPriority(lower: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (/\b(high|urgent|critical|asap|important)\b/.test(lower)) return 'HIGH';
    if (/\b(low|minor|someday|whenever)\b/.test(lower))          return 'LOW';
    return 'MEDIUM';
  }

  private extractDate(lower: string): string | undefined {
    const today = new Date();
    if (/\btoday\b/.test(lower))    return today.toISOString().split('T')[0];
    if (/\btomorrow\b/.test(lower)) { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const d = new Date(today), diff = (i - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        return d.toISOString().split('T')[0];
      }
    }
    if (/\bnext week\b/.test(lower)) { const d = new Date(today); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; }
    return undefined;
  }

  private extractTime(lower: string): string | undefined {
    const m = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!m) return undefined;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2] || '0', 10), ampm = m[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  private extractWritingType(lower: string): WritingType {
    if (/\b(story|short story)\b/.test(lower)) return 'SHORT_STORY';
    if (/\barticle\b/.test(lower))             return 'ARTICLE';
    if (/\bessay\b/.test(lower))               return 'ESSAY';
    if (/\bscript\b/.test(lower))             return 'SCRIPT';
    if (/\b(poem|poetry)\b/.test(lower))       return 'POETRY';
    if (/\bblog\b/.test(lower))                return 'BLOG_POST';
    if (/\bresearch\b/.test(lower))            return 'RESEARCH';
    return 'NOVEL';
  }

  private extractHashTags(lower: string): string[] {
    return lower.match(/#(\w+)/g)?.map(t => t.slice(1)) || [];
  }

  private addOneHour(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // ── Template helpers ──────────────────────────────────────────────────────────

  getGreeting(): string {
    const h = new Date().getHours(), name = this.userName() || 'there';
    if (h < 12) return `Good Morning, ${name}`;
    if (h < 18) return `Good Afternoon, ${name}`;
    return `Good Evening, ${name}`;
  }

  navigateToCreated() {
    const c = this.lastCreated();
    if (c) this.router.navigate([c.route]);
    this.lastCreated.set(null);
  }

  setExampleText(text: string) {
    this.inputText.set(text);
    setTimeout(() => (document.querySelector('.main-text-input') as HTMLInputElement)?.focus(), 50);
  }

  clearCommand() {
    this.inputText.set('');
    this.liveTranscript.set('');
    this.attachments.set([]);
    this.lastCreated.set(null);
    this.clearConversation();
    if (this.listening()) this.recognition?.stop();
  }

  triggerFileUpload() {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true;
    input.onchange = (e: any) =>
      this.attachments.update(a => [...a, ...Array.from<File>(e.target.files).map(f => f.name)]);
    input.click();
  }

  removeAttachment(index: number) {
    this.attachments.update(a => a.filter((_, i) => i !== index));
  }
}
