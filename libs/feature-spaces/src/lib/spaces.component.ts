import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { StoreService, WorkspaceProfileService } from '@envello/core';

@Component({
  selector: 'app-spaces',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './spaces.component.html',
  styleUrl: './spaces.component.css'
})
export class SpacesComponent {
  public store = inject(StoreService);
  private router = inject(Router);
  private workspaceService = inject(WorkspaceProfileService);

  openProject(id: string) {
    this.router.navigate(['/spaces', id]);
  }

  createNewProject() {
    const newId = crypto.randomUUID();
    const title = 'New Project';
    this.store.addProject({
      id: newId,
      title,
      description: '',
      status: 'PLANNING',
      words: 0,
      updated: new Date().toISOString(),
      icon: 'folder'
    });
    this.workspaceService.addProfileWithId(newId, title, '#3b82f6', 'folder');
    this.router.navigate(['/spaces', newId]);
  }

  deleteProject(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.store.deleteProject(id);
    this.workspaceService.removeProfile(id);
  }
}
