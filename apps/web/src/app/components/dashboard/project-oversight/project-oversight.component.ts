import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent, BadgeVariant } from '@envello/ui';

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
  imports: [CommonModule, BadgeComponent],
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

  getStatusVariant(status: string): BadgeVariant {
    switch (status) {
      case 'DRAFTING': return 'warning';
      case 'PLANNING': return 'info';
      case 'COMPLETE': return 'success';
      case 'REVIEW':   return 'accent';
      default:         return 'default';
    }
  }
}
