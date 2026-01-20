import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Activity {
  id: string;
  action: string;
  icon: string;
  time: string;
}

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-activity.component.html',
  styleUrl: './recent-activity.component.css'
})
export class RecentActivityComponent {
  activities = signal<Activity[]>([
    {
      id: '1',
      action: 'Edited Chapter 3 in Project Alpha',
      icon: 'edit',
      time: '14:20',
    },
    {
      id: '2',
      action: 'New Research Note added to Neon Orchard',
      icon: 'person',
      time: '12:10',
    },
    {
      id: '3',
      action: 'Cloud Backup completed for all projects',
      icon: 'cloud',
      time: '09:45',
    },
  ]);
}
