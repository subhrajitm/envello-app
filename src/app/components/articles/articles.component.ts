import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Article {
  id: string;
  title: string;
  platform: string;
  pipeline: 'PUBLISHED' | 'DRAFT' | 'REVIEW' | 'SCHEDULED';
  wordCount: string;
  engagement?: {
    views: string;
    comments: string;
  };
  lastUpdated: string;
  icon: string;
}

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.css'
})
export class ArticlesComponent {
  selectedPlatform = signal('All Platforms');
  selectedStatus = signal('All Statuses');
  activeArticleId = signal<string | null>(null);

  articles: Article[] = [
    {
      id: '1',
      title: 'Scaling Enterprise SaaS: The 2024 Architecture Guide',
      platform: 'Medium',
      pipeline: 'PUBLISHED',
      wordCount: '2,450',
      engagement: { views: '12.4k', comments: '842' },
      lastUpdated: 'Oct 28, 2023 · 14:02',
      icon: 'description',
    },
    {
      id: '2',
      title: 'The Future of Remote-First Management Styles',
      platform: 'Substack',
      pipeline: 'DRAFT',
      wordCount: '1,120',
      engagement: undefined,
      lastUpdated: '2 hours ago',
      icon: 'edit',
    },
    {
      id: '3',
      title: 'Why "Nano Banana" Aesthetic is Taking Over UX Design',
      platform: 'Blog',
      pipeline: 'REVIEW',
      wordCount: '850',
      engagement: undefined,
      lastUpdated: 'Yesterday, 18:45',
      icon: 'chat_bubble',
    },
    {
      id: '4',
      title: 'Monthly Roundup: October Tech Innovations',
      platform: 'Medium',
      pipeline: 'SCHEDULED',
      wordCount: '3,100',
      engagement: { views: 'Pending', comments: '' },
      lastUpdated: 'Oct 26, 2023 · 09:15',
      icon: 'calendar_today',
    },
    {
      id: '5',
      title: 'The Rise of the Project Manager Creator',
      platform: 'Substack',
      pipeline: 'PUBLISHED',
      wordCount: '1,820',
      engagement: { views: '3.1k', comments: '112' },
      lastUpdated: 'Oct 22, 2023 · 21:30',
      icon: 'description',
    },
  ];

  getPipelineColor(pipeline: string): string {
    switch (pipeline) {
      case 'PUBLISHED': return 'pipeline-green';
      case 'DRAFT': return 'pipeline-yellow';
      case 'REVIEW': return 'pipeline-blue';
      case 'SCHEDULED': return 'pipeline-orange';
      default: return 'pipeline-gray';
    }
  }
}
