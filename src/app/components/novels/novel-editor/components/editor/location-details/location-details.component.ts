import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '../../../../../services/novel-content.service';

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-details.component.html',
  styleUrl: './location-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationDetailsComponent {
  location = input<Location | null>(null);
  
  updateField = output<{ id: string; field: string; value: string }>();
  addNewLocation = output<void>();
}
