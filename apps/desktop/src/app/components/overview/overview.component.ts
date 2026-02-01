import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {
  store = inject(StoreService);
  private router = inject(Router);

  saveTask() {
    console.log('Saving task...');
    // Logic to save the interpreted task
    // keeping it simple for now as per design request
    alert('Task saved to backlog!');
  }

  discardTask() {
    console.log('Discarding task...');
    // Logic to clear input
  }
}
