import { Injectable, signal, inject } from '@angular/core';
import { BinService } from './bin.service';

export interface Task {
  id: string;
  title: string;
  priority: 'PRIORITY 01' | 'PRIORITY 02' | 'PRIORITY 03';
  hours: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
  project?: string;
  assignee?: string;
  due?: string;
  /** Optional labels/tags associated with this task */
  labels?: string[];
  /** Optional reminders metadata (simple strings for now) */
  reminders?: string[];
}

export interface Note {
  id: string;
  date: string;
  title: string;
  preview: string;
  content: string; // HTML content for simplicity
  tags?: string[];
  lastEdited?: string;
}

export interface PlanningItem {
  id: string;
  title: string;
  tag: string;
  stage: string;
  active: boolean;
}

export interface Activity {
  id: string;
  text: string;
  time: string;
  type: 'entry' | 'sync' | 'ai' | 'system';
}

export interface Novel {
  id: string;
  title: string;
  icon: string;
  status: 'DRAFTING' | 'PLANNING' | 'REVISING' | 'PUBLISHED';
  wordCount: number;
  targetWordCount: number;
  progress: number; // percentage
  chapters: number;
  notesCount: number;
  createdDate: string;
  lastUpdated: string;
  genre: string[];
  isRecentlyUpdated: boolean;
  coverImage?: string; // For thumbnail view
}

const initialTasks: Task[] = [
  { id: '1', title: 'REVIEW EDITOR COMMENTS ON CHAPTER 2', priority: 'PRIORITY 01', hours: '1.5H', status: 'ACTIVE', project: 'Project Alpha', assignee: 'SJ', due: 'Today, 17:00' },
  { id: '2', title: 'DEEP WORK: DRAFTING SESSION CH. 4', priority: 'PRIORITY 01', hours: '3.0H', status: 'ACTIVE', project: 'Project Alpha', assignee: 'SJ', due: 'Today, 14:00' },
  { id: '3', title: 'SYNC WITH MARKETING TEAM', priority: 'PRIORITY 02', hours: '1.0H', status: 'PENDING', project: 'Neon Orchard', assignee: 'MT', due: 'Thu, 10:00' },
  { id: '4', title: 'REVIEW DELAYED RESEARCH NOTE #42', priority: 'PRIORITY 01', hours: '2.0H', status: 'ACTIVE', project: 'Neon Orchard', assignee: 'MT', due: 'Overdue 2h' }
];

const initialNotes: Note[] = [
  { id: '1', date: 'Jan 20, 2026', title: 'Project Phoenix - Q1 Planning', preview: 'Outlined key milestones for Q1 launch. Need to sync with marketing team on timeline and deliverables...', content: '<p>Outlined key milestones for Q1 launch. Need to sync with marketing team on timeline and deliverables.</p><p><strong>Key Points:</strong></p><ul><li>Launch date: March 15th</li><li>Beta testing: Feb 1-28</li><li>Marketing campaign starts Feb 10th</li></ul><p>Follow up with Sarah about budget allocation.</p>', tags: ['pinned', 'work', 'planning'] },
  { id: '2', date: 'Jan 20, 2026', title: 'Morning Reflections', preview: 'Started the day with meditation and journaling. Feeling focused and energized for the week ahead...', content: '<p>Started the day with meditation and journaling. Feeling focused and energized for the week ahead.</p><p>Goals for today:</p><ul><li>Complete project proposal</li><li>Team meeting at 2pm</li><li>Review Q4 metrics</li></ul>', tags: ['personal', 'wellness'] },
  { id: '3', date: 'Jan 19, 2026', title: 'Meeting Notes - Design Review', preview: 'Discussed new UI mockups with the design team. Overall positive feedback, but need to iterate on navigation...', content: '<p>Discussed new UI mockups with the design team. Overall positive feedback, but need to iterate on navigation.</p><p><strong>Action Items:</strong></p><ul><li>Revise navigation flow</li><li>Update color palette</li><li>Create interactive prototype</li></ul><p>Next review scheduled for Jan 25th.</p>', tags: ['pinned', 'meetings', 'design'] },
  { id: '4', date: 'Jan 19, 2026', title: 'Book Notes - Deep Work', preview: 'Chapter 3 insights on creating distraction-free environments. Key takeaway: schedule deep work blocks...', content: '<p>Chapter 3 insights on creating distraction-free environments.</p><p><strong>Key Takeaway:</strong> Schedule deep work blocks in the morning when energy is highest.</p><p>Strategies to implement:</p><ul><li>Turn off notifications 9-11am</li><li>Use focus mode on devices</li><li>Communicate boundaries to team</li></ul>', tags: ['learning', 'productivity'] },
  { id: '5', date: 'Jan 18, 2026', title: 'Weekly Review - Week 3', preview: 'Completed 8 out of 10 planned tasks. Good progress on Project Phoenix. Need to improve time management...', content: '<p>Completed 8 out of 10 planned tasks this week. Good progress on Project Phoenix.</p><p><strong>Wins:</strong></p><ul><li>Finished design mockups</li><li>Launched beta program</li><li>Hit fitness goals</li></ul><p><strong>Areas for Improvement:</strong></p><ul><li>Better time blocking</li><li>Reduce meeting time</li><li>More focused deep work sessions</li></ul>', tags: ['review', 'productivity'] },
  { id: '6', date: 'Jan 18, 2026', title: 'Research - AI Integration Ideas', preview: 'Exploring potential AI features for the product. Focus on natural language processing and automation...', content: '<p>Exploring potential AI features for the product roadmap.</p><p><strong>Ideas:</strong></p><ul><li>Smart task prioritization</li><li>Automated meeting summaries</li><li>Content suggestions</li><li>Sentiment analysis for feedback</li></ul><p>Need to research: OpenAI API, cost estimates, implementation timeline.</p>', tags: ['research', 'ai', 'innovation'] },
  { id: '7', date: 'Jan 17, 2026', title: 'Client Feedback - Acme Corp', preview: 'Received positive feedback on the latest demo. They want to proceed with pilot program starting Feb 1st...', content: '<p>Received positive feedback on the latest demo from Acme Corp.</p><p><strong>Next Steps:</strong></p><ul><li>Draft pilot agreement</li><li>Schedule onboarding session</li><li>Assign dedicated support team</li><li>Set up weekly check-ins</li></ul><p>This could be a major win for Q1!</p>', tags: ['pinned', 'clients', 'sales'] },
  { id: '8', date: 'Jan 17, 2026', title: 'Workout Plan - New Routine', preview: 'Starting a new fitness routine focused on strength training and flexibility. Monday/Wednesday/Friday schedule...', content: '<p>Starting a new fitness routine this week.</p><p><strong>Schedule:</strong></p><ul><li>Monday: Upper body strength</li><li>Wednesday: Lower body + core</li><li>Friday: Full body + flexibility</li></ul><p>Goal: Build consistency over the next 8 weeks.</p>', tags: ['personal', 'fitness', 'goals'] },
  { id: '9', date: 'Jan 16, 2026', title: 'Team Retrospective Notes', preview: 'Sprint 12 retrospective. Team morale is high. Identified some process improvements for next sprint...', content: '<p>Sprint 12 retrospective highlights.</p><p><strong>What went well:</strong></p><ul><li>Hit all sprint goals</li><li>Great collaboration</li><li>Improved code quality</li></ul><p><strong>What to improve:</strong></p><ul><li>Better estimation</li><li>More pair programming</li><li>Reduce technical debt</li></ul>', tags: ['meetings', 'team', 'agile'] },
  { id: '10', date: 'Jan 15, 2026', title: 'Ideas - Product Features', preview: 'Brainstorming session for new product features. Focus on user experience and automation...', content: '<p>Brainstorming new product features based on user feedback.</p><p><strong>Top Ideas:</strong></p><ul><li>Dark mode theme</li><li>Keyboard shortcuts</li><li>Bulk actions</li><li>Advanced search filters</li><li>Mobile app</li></ul><p>Prioritize based on user impact and development effort.</p>', tags: ['ideas', 'product', 'innovation'] }
];

const initialPlanningItems: PlanningItem[] = [
  { id: '1', title: 'Emerald Protocol', tag: 'Fiction', stage: 'Draft 2 • 4d left', active: true },
  { id: '2', title: 'Midnight Kyoto', tag: 'Mystery', stage: 'Planning • 12d left', active: false },
];

const initialActivities: Activity[] = [
  { id: '1', text: "Entry added to 'Morning Pages'", time: '10 MINS AGO', type: 'entry' },
  { id: '2', text: "Sync complete on 3 devices", time: '1 HOUR AGO', type: 'sync' },
  { id: '3', text: "AI Analysis ready for Chapter 1", time: '4 HOURS AGO', type: 'ai' },
];

const initialNovels: Novel[] = [
  {
    id: '1',
    title: 'The Silent Echo',
    icon: 'token',
    status: 'DRAFTING',
    wordCount: 45200,
    targetWordCount: 80000,
    progress: 56,
    chapters: 12,
    notesCount: 24,
    createdDate: 'Oct 12, 2024',
    lastUpdated: '2 hours ago',
    genre: ['Sci-Fi', 'Thriller'],
    isRecentlyUpdated: true
  },
  {
    id: '2',
    title: 'Kingdom of Glass',
    icon: 'castle',
    status: 'PLANNING',
    wordCount: 0,
    targetWordCount: 100000,
    progress: 0,
    chapters: 0,
    notesCount: 156,
    createdDate: 'Nov 01, 2024',
    lastUpdated: 'Yesterday',
    genre: ['Fantasy', 'YA'],
    isRecentlyUpdated: false
  },
  {
    id: '3',
    title: 'Neon Veins',
    icon: 'water_drop',
    status: 'REVISING',
    wordCount: 78500,
    targetWordCount: 75000,
    progress: 104,
    chapters: 28,
    notesCount: 42,
    createdDate: 'Aug 15, 2024',
    lastUpdated: '3 days ago',
    genre: ['Cyberpunk', 'Noir'],
    isRecentlyUpdated: false
  },
  {
    id: '4',
    title: 'Operation: Sunrise',
    icon: 'rocket_launch',
    status: 'PUBLISHED',
    wordCount: 65000,
    targetWordCount: 65000,
    progress: 100,
    chapters: 22,
    notesCount: 18,
    createdDate: 'Jan 10, 2024',
    lastUpdated: '1 month ago',
    genre: ['Action', 'Spy'],
    isRecentlyUpdated: false
  }
];

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  tasks = signal<Task[]>(initialTasks);
  notes = signal<Note[]>(initialNotes);
  planningItems = signal<PlanningItem[]>(initialPlanningItems);
  activities = signal<Activity[]>(initialActivities);
  novels = signal<Novel[]>(initialNovels);

  private bin = inject(BinService);

  constructor() { }

  addTask(task: Task) {
    this.tasks.update(tasks => [...tasks, task]);
    this.addActivity('Task created: ' + task.title, 'system');
  }

  updateTask(id: string, updates: Partial<Task>) {
    this.tasks.update(tasks =>
      tasks.map(task => task.id === id ? { ...task, ...updates } : task)
    );
    this.addActivity('Task updated', 'system');
  }

  deleteTask(id: string) {
    const existingTasks = this.tasks();
    const taskToDelete = existingTasks.find(t => t.id === id);

    if (taskToDelete) {
      this.bin.addToBin({
        type: 'task',
        originalId: taskToDelete.id,
        title: taskToDelete.title,
        payload: taskToDelete
      });
    }

    this.tasks.set(existingTasks.filter(t => t.id !== id));
    this.addActivity('Task deleted', 'system');
  }

  addNote(note: Note) {
    this.notes.update(notes => [note, ...notes]);
    this.addActivity("Entry added to '" + note.title + "'", 'entry');
  }

  updateNote(id: string, updates: Partial<Note>) {
    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    this.notes.update(notes =>
      notes.map(note => note.id === id ? {
        ...note,
        ...updates,
        lastEdited: updates.lastEdited || timeString
      } : note)
    );
  }

  deleteNote(id: string) {
    const existingNotes = this.notes();
    const noteToDelete = existingNotes.find(n => n.id === id);

    if (noteToDelete) {
      this.bin.addToBin({
        type: 'daily-note',
        originalId: noteToDelete.id,
        title: noteToDelete.title,
        payload: noteToDelete
      });
    }

    this.notes.set(existingNotes.filter(n => n.id !== id));
    this.addActivity('Note deleted', 'system');
  }

  addPlanningItem(item: PlanningItem) {
    this.planningItems.update(items => [...items, item]);
  }

  addNovel(novel: Novel) {
    this.novels.update(novels => [...novels, novel]);
    this.addActivity('Project started: ' + novel.title, 'system');
  }

  addActivity(text: string, type: Activity['type'] = 'entry') {
    const newActivity: Activity = {
      id: Date.now().toString(),
      text,
      time: 'Just now',
      type
    };
    this.activities.update(activities => [newActivity, ...activities.slice(0, 49)]); // Keep last 50
  }
}
