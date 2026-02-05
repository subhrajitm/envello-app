import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService, Project, Task, Activity } from '../../services/store.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {
  store = inject(StoreService);
  router = inject(Router);

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

  // 1. Projects Summary
  activeProjects = computed(() => {
    return this.store.projects().filter(p => p.status !== 'COMPLETE').slice(0, 4);
  });

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

  // 3. Recent Activity Stream mapped to "Context Stream" cards
  contextStream = computed(() => {
    // Merge tasks and activities into a unified stream
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
        content: `"${a.text}"`,
        sub: 'System Log',
        time: a.time,
        tags: ['#log', '#' + a.type]
      };
    });

    const tasks = this.store.tasks().slice(0, 5).map(t => ({
      id: t.id,
      type: 'ACTION ITEM',
      tagClass: 'action',
      content: t.title + (t.description ? `. ${t.description}` : ''),
      sub: 'Priority: ' + t.priority,
      time: 'Just now',
      tags: t.labels?.map(l => '#' + l) || ['#task']
    }));

    // Interleave
    const merged = [...tasks, ...activities].sort(() => Math.random() - 0.5);

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
      activeProjects: this.store.projects().filter(p => p.status === 'PLANNING' || p.status === 'DRAFTING').length,
      pendingTasks: activeTasks,
      completedTasks: completedTasks,
      totalWords: totalWords > 1000 ? (totalWords / 1000).toFixed(1) + 'k' : totalWords,
      systemStatus: 'OPERATIONAL'
    };
  });

  systemTime = signal(new Date());

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

      // Randomize Metrics periodically
      setInterval(() => {
        this.cpuUsage.set(Math.floor(Math.random() * 30) + 5); // 5-35%
        this.latency.set(Math.floor(Math.random() * 50) + 10); // 10-60ms
      }, 3000);
    }
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
    else if (lower.startsWith('create project') || lower.startsWith('new project')) {
      this.createProjectFromVoice(rawInput);
    } else if (lower.startsWith('remind me') || lower.startsWith('add task') || lower.startsWith('todo')) {
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

  private createProjectFromVoice(input: string) {
    const title = input.replace(/^(create|new) project/i, '').trim() || 'New Project';
    const newProject: Project = {
      id: crypto.randomUUID(),
      title: title,
      status: 'PLANNING',
      words: '0',
      updated: new Date().toISOString(),
      icon: 'rocket_launch',
      description: 'Created via command center',
      priority: 'MEDIUM',
      progress: 0,
      tags: ['Voice-Created'],
      type: 'SINGLE'
    };
    this.store.addProject(newProject);
  }

  private createTaskFromVoice(input: string) {
    const title = input.replace(/^(remind me to|add task|todo|task:)/i, '').trim();
    const hasAttachments = this.attachments().length > 0;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title + (hasAttachments ? ` [${this.attachments().length} attachments]` : ''),
      priority: 'MEDIUM',
      hours: '0',
      status: 'ACTIVE',
      due: new Date().toISOString(), // Default to today
      notes: `Created via command center.\nAttachments: ${this.attachments().join(', ')}`
    };
    this.store.addTask(newTask);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Admin';
    if (hour < 18) return 'Good Afternoon, Admin';
    return 'Good Evening, Admin';
  }
}
