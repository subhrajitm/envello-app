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
  tags?: string[];
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
