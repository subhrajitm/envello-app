import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Novel {
  id: string;
  title: string;
  status: 'DRAFTING' | 'PLANNING' | 'PUBLISHED' | 'REVISING';
  wordCount: string;
  lastUpdated: string;
  icon: string;
  progress: number;
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
      lastUpdated: '2h ago',
      icon: 'description',
      progress: 58,
    },
    {
      id: '2',
      title: 'Neon Orchard Chronicles',
      status: 'PLANNING',
      wordCount: '12,500',
      lastUpdated: 'Yesterday, 14:20',
      icon: 'description',
      progress: 15,
    },
    {
      id: '3',
      title: 'The Scent of Green',
      status: 'PUBLISHED',
      wordCount: '82,100',
      lastUpdated: 'Oct 24, 2023',
      icon: 'check_circle',
      progress: 100,
    },
    {
      id: '4',
      title: 'Echoes of the Void',
      status: 'REVISING',
      wordCount: '35,000',
      lastUpdated: '3 days ago',
      icon: 'description',
      progress: 42,
    },
    {
      id: '5',
      title: 'Midnight in Berlin',
      status: 'DRAFTING',
      wordCount: '15,200',
      lastUpdated: 'Nov 01, 2023',
      icon: 'description',
      progress: 18,
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
