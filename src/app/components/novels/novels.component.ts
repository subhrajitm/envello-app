import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Novel {
  id: string;
  title: string;
  status: 'DRAFTING' | 'PLANNING' | 'PUBLISHED' | 'REVISING';
  wordCount: string;
  wordCountNumeric: number;
  targetWordCount: number;
  lastUpdated: string;
  icon: string;
  progress: number;
  chapters: number;
  genre: string[];
  createdDate: string;
  notesCount: number;
  isRecentlyUpdated: boolean;
}

@Component({
  selector: 'app-novels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './novels.component.html',
  styleUrl: './novels.component.css'
})
export class NovelsComponent {
  private router = inject(Router);

  novels: Novel[] = [
    {
      id: '1',
      title: 'Project Alpha: Final Manuscript',
      status: 'DRAFTING',
      wordCount: '48,240',
      wordCountNumeric: 48240,
      targetWordCount: 80000,
      lastUpdated: '2h ago',
      icon: 'description',
      progress: 60,
      chapters: 12,
      genre: ['Sci-Fi', 'Thriller'],
      createdDate: 'Jan 15, 2024',
      notesCount: 24,
      isRecentlyUpdated: true,
    },
    {
      id: '2',
      title: 'Neon Orchard Chronicles',
      status: 'PLANNING',
      wordCount: '12,500',
      wordCountNumeric: 12500,
      targetWordCount: 100000,
      lastUpdated: 'Yesterday, 14:20',
      icon: 'description',
      progress: 13,
      chapters: 5,
      genre: ['Fantasy', 'Adventure'],
      createdDate: 'Jan 10, 2024',
      notesCount: 8,
      isRecentlyUpdated: true,
    },
    {
      id: '3',
      title: 'The Scent of Green',
      status: 'PUBLISHED',
      wordCount: '82,100',
      wordCountNumeric: 82100,
      targetWordCount: 80000,
      lastUpdated: 'Oct 24, 2023',
      icon: 'check_circle',
      progress: 100,
      chapters: 24,
      genre: ['Literary Fiction', 'Drama'],
      createdDate: 'Mar 05, 2023',
      notesCount: 42,
      isRecentlyUpdated: false,
    },
    {
      id: '4',
      title: 'Echoes of the Void',
      status: 'REVISING',
      wordCount: '35,000',
      wordCountNumeric: 35000,
      targetWordCount: 75000,
      lastUpdated: '3 days ago',
      icon: 'description',
      progress: 47,
      chapters: 9,
      genre: ['Horror', 'Mystery'],
      createdDate: 'Dec 20, 2023',
      notesCount: 15,
      isRecentlyUpdated: true,
    },
    {
      id: '5',
      title: 'Midnight in Berlin',
      status: 'DRAFTING',
      wordCount: '15,200',
      wordCountNumeric: 15200,
      targetWordCount: 90000,
      lastUpdated: 'Nov 01, 2023',
      icon: 'description',
      progress: 17,
      chapters: 4,
      genre: ['Historical', 'Romance'],
      createdDate: 'Oct 28, 2023',
      notesCount: 6,
      isRecentlyUpdated: false,
    },
  ];

  getStatusColor(status: string) {
    switch (status) {
      case 'DRAFTING': return 'status-yellow';
      case 'PLANNING': return 'status-gray';
      case 'PUBLISHED': return 'status-green';
      case 'REVISING': return 'status-orange';
      default: return 'status-gray';
    }
  }

  getProgressColor(status: string) {
    switch (status) {
      case 'PUBLISHED': return '#4ade80';
      default: return '#ffd700'; // Var accent-primary
    }
  }

  openNovel(id: string) {
    this.router.navigate(['/novels', id]);
  }
}
