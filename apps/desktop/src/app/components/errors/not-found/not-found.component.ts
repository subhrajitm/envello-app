import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {
  private router = inject(Router);
  readonly attemptedUrl = this.router.url.split('?')[0];

  readonly quickLinks = [
    { route: '/workspace',   icon: 'home',           label: 'Workspace' },
    { route: '/tasks',       icon: 'checklist',      label: 'Tasks' },
    { route: '/daily-notes', icon: 'note',           label: 'Notes' },
    { route: '/write',       icon: 'edit',           label: 'Write' },
    { route: '/knowledge',   icon: 'hub',            label: 'Knowledge' },
    { route: '/vault',       icon: 'lock',           label: 'Vault' },
  ];
}
