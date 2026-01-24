import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '../../../../../services/novel-content.service';

@Component({
  selector: 'app-locations-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locations-list.component.html',
  styleUrl: './locations-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationsListComponent {
  locations = input.required<Location[]>();
  selectedLocationId = input.required<string | null>();
  
  selectLocation = output<string>();
  deleteLocation = output<{ id: string; name?: string }>();
  addNewLocation = output<void>();
}
