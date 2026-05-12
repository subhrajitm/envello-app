import { Component, input, output, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@envello/core';

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-details.component.html',
  styleUrls: [
    './location-details.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class LocationDetailsComponent {
  location = input<Location | null>(null);
  
  updateField = output<{ id: string; field: string; value: string }>();
  addNewLocation = output<void>();
}
