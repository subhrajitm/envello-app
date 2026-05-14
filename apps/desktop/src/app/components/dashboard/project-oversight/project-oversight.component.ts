import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '@envello/core';

@Component({
  selector: 'app-project-oversight',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './project-oversight.component.html',
  styleUrl: './project-oversight.component.css'
})
export class ProjectOversightComponent {
  private store = inject(StoreService);
  projects = this.store.projects;


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
