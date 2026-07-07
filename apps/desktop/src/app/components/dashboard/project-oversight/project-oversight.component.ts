import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StoreService } from '@envello/core';
import { BadgeComponent, BadgeVariant } from '@envello/ui';

@Component({
  selector: 'app-project-oversight',
  standalone: true,
  imports: [CommonModule, RouterLink, BadgeComponent],
  templateUrl: './project-oversight.component.html',
  styleUrl: './project-oversight.component.css'
})
export class ProjectOversightComponent {
  private store = inject(StoreService);
  projects = this.store.spaces;


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
