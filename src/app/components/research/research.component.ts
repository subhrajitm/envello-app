import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ResearchItem {
  id: string;
  title: string;
  description: string;
  sourceType: 'WEB' | 'PDF' | 'INTERVIEW' | 'PHYSICAL';
  relevance: string;
  tags: string[];
  icon: string;
  actionIcon: string;
}

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './research.component.html',
  styleUrl: './research.component.css'
})
export class ResearchComponent {
  selectedProject = signal('All Research');
  verifiedChecked = signal(true);
  unreadChecked = signal(false);
  viewMode = signal<'TABLE' | 'GRID'>('TABLE');

  researchItems: ResearchItem[] = [
    {
      id: '1',
      title: 'Victorian London Architecture',
      description: 'britishlibrary.org.uk/arch-history-1850',
      sourceType: 'WEB',
      relevance: 'Project Alpha',
      tags: ['History', 'Urban'],
      icon: 'language',
      actionIcon: 'open_in_new',
    },
    {
      id: '2',
      title: 'Martian Soil Composition (Survey-2044)',
      description: 'Local Storage / Research / Science / PDF',
      sourceType: 'PDF',
      relevance: 'Mars Colony: Epsilon',
      tags: ['Science', 'Environment'],
      icon: 'picture_as_pdf',
      actionIcon: 'visibility',
    },
    {
      id: '3',
      title: 'Interview with Dr. Aris Thorne',
      description: 'Audio Recording - 42:15 mins',
      sourceType: 'INTERVIEW',
      relevance: 'The Green Scent',
      tags: ['Botany', 'Expert'],
      icon: 'record_voice_over',
      actionIcon: 'play_circle',
    },
    {
      id: '4',
      title: 'The Industrial Evolution (Chapter 4)',
      description: 'Physical Book - Page 112-145',
      sourceType: 'PHYSICAL',
      relevance: 'Project Alpha',
      tags: ['Steampunk'],
      icon: 'menu_book',
      actionIcon: 'bookmark',
    },
    {
      id: '5',
      title: 'Atmospheric Pressure on Highlands',
      description: 'nasa.gov/mars/atmosphere-data',
      sourceType: 'WEB',
      relevance: 'Mars Colony: Epsilon',
      tags: ['Physics', 'Atmosphere'],
      icon: 'language',
      actionIcon: 'open_in_new',
    },
  ];

  projects = [
    { name: 'All Research', count: 124 },
    { name: 'Victorian London Project', count: 42 },
    { name: 'Mars Colony: Epsilon', count: 18 },
    { name: 'The Green Scent', count: 31 },
  ];

  topics = [
    { name: 'Architecture', color: 'blue-500' },
    { name: 'Sociology', color: 'purple-500' },
    { name: 'Technology', color: 'orange-500' },
    { name: 'Botany', color: 'green-500' },
  ];

  getSourceTypeColor(type: string) {
    switch (type) {
      case 'WEB': return 'source-blue';
      case 'PDF': return 'source-red';
      case 'INTERVIEW': return 'source-purple';
      case 'PHYSICAL': return 'source-orange';
      default: return 'source-gray';
    }
  }

  getIconColorClass(type: string) {
    switch (type) {
      case 'WEB': return 'text-blue-400';
      case 'PDF': return 'text-red-400';
      case 'INTERVIEW': return 'text-purple-400';
      case 'PHYSICAL': return 'text-orange-400';
      default: return '';
    }
  }

  getActionIcon(icon: string) {
    return icon === 'link' ? 'open_in_new' : icon;
  }
}
