import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@envello/core';

@Component({
  selector: 'app-locations-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locations-list.component.html',
  styleUrls: [
    './locations-list.component.css',
    '../../../novel-editor.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LocationsListComponent {
  locations = input.required<Location[]>();
  selectedLocationId = input.required<string | null>();

  selectLocation = output<string>();
  deleteLocation = output<{ id: string; name?: string }>();
  addNewLocation = output<void>();
}
