import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Project {
  id: string;
  title: string;
  status: 'DRAFTING' | 'PLANNING' | 'COMPLETE' | 'REVIEW';
  words: string;
  updated: string;
  icon: string;
}

@Component({
  selector: 'app-project-oversight',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-oversight.component.html',
  styleUrl: './project-oversight.component.css'
})
export class ProjectOversightComponent {
  projects = signal<Project[]>([
    {
      id: '1',
      title: 'Project Alpha: Final Manuscript',
      status: 'DRAFTING',
      words: '48.2k',
      updated: '2m ago',
      icon: 'menu_book',
    },
    {
      id: '2',
      title: 'Neon Orchard Chronicles',
      status: 'PLANNING',
      words: '12.5k',
      updated: '1h ago',
      icon: 'description',
    },
    {
      id: '3',
      title: 'The Scent of Green',
      status: 'COMPLETE',
      words: '82.1k',
      updated: 'Oct 24',
      icon: 'check_circle',
    },
    {
      id: '4',
      title: 'Echoes of the Void',
      status: 'REVIEW',
      words: '35.0k',
      updated: '2d ago',
      icon: 'extension',
    },
  ]);

  getStatusColor(status: string): string {
    switch (status) {
      case 'DRAFTING':
        return 'status-yellow';
      case 'PLANNING':
        return 'status-blue';
      case 'COMPLETE':
        return 'status-green';
      case 'REVIEW':
        return 'status-orange';
      default:
        return 'status-gray';
    }
  }
}
