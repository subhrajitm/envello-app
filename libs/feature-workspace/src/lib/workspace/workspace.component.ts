import { Component, computed, inject, signal, effect, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService, Task, Activity, UserService, NotificationService } from '@envello/core';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceComponent {
  store = inject(StoreService);
  router = inject(Router);
  userService = inject(UserService);
  notificationService = inject(NotificationService);

  // --- UI State ---
  inputText = signal('');
  listening = signal(false);
  liveTranscript = signal('');
  confidence = signal(0);

  // Filtering
  activeFilter = signal<'ALL' | 'ACTION ITEM' | 'LOG' | 'SYNC' | 'SYSTEM' | 'AI THOUGHT'>('ALL');

  // Attachments
  attachments = signal<string[]>([]);

  // Footer Metrics (Mock)
  cpuUsage = signal(12);
  latency = signal(24);

  // --- Computed Dashboard Data ---



  // 2. High Priority Tasks
  upcomingTasks = computed(() => {
    return this.store.tasks()
      .filter(t => t.status !== 'COMPLETED')
      .sort((a, b) => {
        // Sort by priority (High first) then by due date if available
        const pMap = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        if (pMap[a.priority] !== pMap[b.priority]) return pMap[a.priority] - pMap[b.priority];
        return (a.due || '9999').localeCompare(b.due || '9999');
      })
      .slice(0, 5);
  });

  // 3. Recent Activity Stream mapped to "Context Stream" cards - REAL DATA ONLY
  contextStream = computed(() => {
    // Merge projects, tasks, and activities into a unified stream

    // Real activities from store
    const activities = this.store.activities().slice(0, 10).map(a => {
      let type = 'LOG';
      let tagClass = 'reference';
      if (a.type === 'sync') { type = 'SYNC'; tagClass = 'sync'; }
      if (a.type === 'system') { type = 'SYSTEM'; tagClass = 'system'; }
      if (a.type === 'ai') { type = 'AI THOUGHT'; tagClass = 'note'; }

      return {
        id: a.id,
        type: type,
        tagClass: tagClass,
        content: a.text,
        sub: 'System Log',
        time: a.time,
        tags: ['#log', '#' + a.type],
        tasks: [] as any[],
        sortDate: new Date().getTime() // Activities don't have dates, use current
      };
    });

    // Real tasks from store
    const taskItems = this.store.tasks().slice(0, 8).map(t => {
      const dueDate = t.due ? new Date(t.due) : new Date();
      return {
        id: t.id,
        type: 'ACTION ITEM',
        tagClass: 'action',
        content: t.title + (t.description ? `. ${t.description}` : ''),
        sub: 'Priority: ' + t.priority,
        time: this.formatRelativeTime(dueDate),
        tags: t.labels?.map(l => '#' + l) || ['#task'],
        tasks: [] as any[],
        sortDate: dueDate.getTime()
      };
    });


    // Merge and sort by date (most recent first)
    const merged = [...taskItems, ...activities]
      .sort((a, b) => b.sortDate - a.sortDate);

    // Filter
    if (this.activeFilter() === 'ALL') return merged;
    return merged.filter(item => item.type === this.activeFilter());
  });

  // 4. Quick Stats
  stats = computed(() => {
    const tasks = this.store.tasks();
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const activeTasks = tasks.filter(t => t.status === 'ACTIVE').length;

    const novels = this.store.novels();
    const totalWords = novels.reduce((acc, n) => acc + n.wordCount, 0);

    return {
      pendingTasks: activeTasks,
      completedTasks: completedTasks,
      totalWords: totalWords > 1000 ? (totalWords / 1000).toFixed(1) + 'k' : totalWords,
      systemStatus: 'OPERATIONAL'
    };
  });

  systemTime = signal(new Date());

  // Linked entities (projects/tasks count)
  linkedEntities = computed(() => {
    const activeTasks = this.store.tasks().filter(t => t.status !== 'COMPLETED').length;
    return { tasks: activeTasks };
  });

  // User's name for personalized greeting
  userName = computed(() => this.userService.userName());

  // --- Keyboard Shortcuts ---
  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    // Cmd/Ctrl + K - Focus command input
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      const input = document.querySelector('.main-text-input') as HTMLInputElement;
      input?.focus();
    }
    // Escape - Clear and stop
    if (event.key === 'Escape') {
      this.clearCommand();
    }
  }

  // --- Voice Recognition Setup ---
  private recognition: any;
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      this.initSpeechRecognition();

      // Update time every minute
      setInterval(() => {
        this.systemTime.set(new Date());
      }, 60000);

      // Update real performance metrics
      this.updatePerformanceMetrics();
      setInterval(() => {
        this.updatePerformanceMetrics();
      }, 5000);
    }
  }

  // Real performance metrics using Performance API
  private updatePerformanceMetrics() {
    if (typeof performance !== 'undefined') {
      // Get navigation timing for latency estimate
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const latencyMs = Math.round(navigation.responseEnd - navigation.requestStart);
        this.latency.set(Math.min(latencyMs, 100)); // Cap at 100 for display
      }

      // Estimate CPU from task processing (rough approximation)
      const startTime = performance.now();
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += Math.sqrt(i);
      const elapsed = performance.now() - startTime;
      // Higher elapsed = slower CPU = higher usage representation
      const cpuEstimate = Math.min(Math.round(elapsed * 10), 50);
      this.cpuUsage.set(cpuEstimate > 0 ? cpuEstimate : 5);
    }
  }

  // Format date to relative time string
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.listening.set(true);
      this.confidence.set(0);
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
          const conf = event.results[i][0].confidence;
          this.confidence.set(Math.round(conf * 100));
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        this.inputText.set(this.inputText() + (this.inputText() ? ' ' : '') + final);
        this.liveTranscript.set('');
      } else if (interim) {
        this.liveTranscript.set(interim);
      }
    };

    this.recognition.onend = () => {
      this.listening.set(false);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      this.listening.set(false);
    };
  }

  toggleVoice() {
    if (!this.recognition) return;
    if (this.listening()) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }

  // --- Actions ---

  executeCommand() {
    const rawInput = this.inputText().trim();
    if (!rawInput) return;

    const lower = rawInput.toLowerCase();

    // 1. Navigation
    if (lower.startsWith('go to') || lower.startsWith('open') || lower.startsWith('navigate to')) {
      this.handleNavigationCommand(lower);
    }
    // 2. Creation
    else if (lower.startsWith('remind me') || lower.startsWith('add task') || lower.startsWith('todo')) {
      this.createTaskFromVoice(rawInput);
    } else {
      // Default to a generic note or task
      this.createTaskFromVoice("Task: " + rawInput);
    }

    this.inputText.set('');
    this.liveTranscript.set('');
    this.attachments.set([]); // Clear attachments after processing
  }

  handleNavigationCommand(command: string) {
    const target = command.replace(/^(go to|open|navigate to)/i, '').trim();
    const routes: Record<string, string[]> = {
      'novels': ['/novels'], 'fiction': ['/novels'],
      'settings': ['/developer-settings'], 'dev': ['/developer-settings'],
      'tasks': ['/tasks'], 'todos': ['/tasks'],
      'notes': ['/daily-notes'], 'daily': ['/daily-notes'],
      'research': ['/research'],
      'profile': ['/profile'],
      'logs': ['/activity-log'],
      'bin': ['/bin']
    };

    const route = Object.keys(routes).find(key => target.includes(key));
    if (route) {
      this.router.navigate(routes[route]);
    } else {
      // Feedback?
      console.warn('Unknown navigation target:', target);
    }
  }

  clearCommand() {
    this.inputText.set('');
    this.liveTranscript.set('');
    this.attachments.set([]);
    if (this.listening()) {
      this.recognition.stop();
    }
  }

  triggerFileUpload() {
    // Mock File Upload interaction
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.onchange = (e: any) => {
      const files = Array.from(e.target.files) as File[];
      this.handleFiles(files);
    };
    fileInput.click();
  }

  handleFiles(files: File[]) {
    const current = this.attachments();
    const newNames = files.map(f => f.name);
    this.attachments.set([...current, ...newNames]);
  }

  removeAttachment(index: number) {
    const current = this.attachments();
    current.splice(index, 1);
    this.attachments.set([...current]);
  }

  toggleFilter() {
    const filters: ('ALL' | 'ACTION ITEM' | 'LOG' | 'SYNC' | 'SYSTEM' | 'AI THOUGHT')[] = ['ALL', 'ACTION ITEM', 'LOG', 'SYNC', 'SYSTEM', 'AI THOUGHT'];
    const currentIndex = filters.indexOf(this.activeFilter());
    const nextIndex = (currentIndex + 1) % filters.length;
    this.activeFilter.set(filters[nextIndex]);
  }

  openItem(item: any) {
    // Navigate based on item type
    if (item.type === 'ACTION ITEM') {
      this.router.navigate(['/tasks'], { queryParams: { focus: item.id } });
    } else {
      this.router.navigate(['/activity-log']); // Fallback for logs
    }
  }

  private createTaskFromVoice(input: string) {
    const rawContent = input.replace(/^(remind me to|add task|todo|task:)/i, '').trim();
    if (!rawContent) return;

    // Detect multiple tasks via newlines
    const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Create tasks
    lines.forEach((line, index) => {
      const hasAttachments = index === 0 && this.attachments().length > 0;
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: line + (hasAttachments ? ` [${this.attachments().length} attachments]` : ''),
        priority: 'MEDIUM',
        hours: '0',
        status: 'ACTIVE',
        project: '', 
        due: new Date().toISOString(),
        notes: `Task created from context stream.`
      };
      this.store.addTask(newTask);
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    const name = this.userName() || 'there';
    if (hour < 12) return `Good Morning, ${name}`;
    if (hour < 18) return `Good Afternoon, ${name}`;
    return `Good Evening, ${name}`;
  }
}
