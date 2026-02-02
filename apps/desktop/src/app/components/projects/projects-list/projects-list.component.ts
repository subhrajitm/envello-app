import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService } from '../../../services/store.service';

@Component({
    selector: 'app-projects-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './projects-list.component.html',
    styleUrl: './projects-list.component.css'
})
export class ProjectsListComponent {
    store = inject(StoreService);
    router = inject(Router);

    navigateToProject(id: string) {
        this.router.navigate(['/projects', id]);
    }
}
