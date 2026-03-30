import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'env-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton-loader.component.html',
  styleUrl: './skeleton-loader.component.css',
})
export class SkeletonLoaderComponent {
  /** 'list' renders stacked rows; 'card' renders a card block */
  @Input() variant: 'list' | 'card' = 'list';
  /** Number of rows (list) or cards (card) to show */
  @Input() rows = 4;

  get rowsArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
