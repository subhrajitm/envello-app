import { Injectable, signal } from '@angular/core';

export interface Task {
  id: string;
  title: string;
  priority: 'PRIORITY 01' | 'PRIORITY 02' | 'PRIORITY 03';
  hours: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
  project?: string;
  assignee?: string;
  due?: string;
}

export interface Note {
  id: string;
  date: string;
  title: string;
  preview: string;
  content: string; // HTML content for simplicity
}

const initialTasks: Task[] = [
  { id: '1', title: 'REVIEW EDITOR COMMENTS ON CHAPTER 2', priority: 'PRIORITY 01', hours: '1.5H', status: 'ACTIVE', project: 'Project Alpha', assignee: 'SJ', due: 'Today, 17:00' },
  { id: '2', title: 'DEEP WORK: DRAFTING SESSION CH. 4', priority: 'PRIORITY 01', hours: '3.0H', status: 'ACTIVE', project: 'Project Alpha', assignee: 'SJ', due: 'Today, 14:00' },
  { id: '3', title: 'SYNC WITH MARKETING TEAM', priority: 'PRIORITY 02', hours: '1.0H', status: 'PENDING', project: 'Neon Orchard', assignee: 'MT', due: 'Thu, 10:00' },
  { id: '4', title: 'REVIEW DELAYED RESEARCH NOTE #42', priority: 'PRIORITY 01', hours: '2.0H', status: 'ACTIVE', project: 'Neon Orchard', assignee: 'MT', due: 'Overdue 2h' }
];

const initialNotes: Note[] = [
  { id: '1', date: 'Oct 19, 2023', title: 'Daily Standup & Goals', preview: 'Focus on the API integration today...', content: '<p><strong>Today\'s Focus:</strong></p><ul><li>Finish the Auth API integration.</li><li>Review PR #42 from Sarah.</li></ul>' },
  { id: '2', date: 'Oct 18, 2023', title: 'Meeting Notes: Design Team', preview: 'Discusssed the new typography system...', content: '<p>Met with Design. Decided on Inter font family.</p>' },
];

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  tasks = signal<Task[]>(initialTasks);
  notes = signal<Note[]>(initialNotes);

  constructor() { }

  addTask(task: Task) {
    this.tasks.update(tasks => [...tasks, task]);
  }

  addNote(note: Note) {
    this.notes.update(notes => [note, ...notes]);
  }
}
