import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { StoreService } from '@envello/core';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent {
  public store = inject(StoreService);
  private router = inject(Router);

  openProject(id: string) {
    this.router.navigate(['/projects', id]);
  }

  createNewProject() {
    const newId = crypto.randomUUID();
    this.store.addProject({
      id: newId,
      title: 'New Project',
      description: '',
      status: 'PLANNING',
      words: 0,
      updated: new Date().toISOString(),
      icon: 'folder'
    });
    this.router.navigate(['/projects', newId]);
  }

  deleteProject(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.store.deleteProject(id);
  }
}
