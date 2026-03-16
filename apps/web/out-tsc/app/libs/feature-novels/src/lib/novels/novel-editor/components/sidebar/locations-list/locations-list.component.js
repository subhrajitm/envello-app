import { __decorate } from 'tslib';
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
let LocationsListComponent = class LocationsListComponent {
  locations = input.required();
  selectedLocationId = input.required();
  selectLocation = output();
  deleteLocation = output();
  addNewLocation = output();
};
LocationsListComponent = __decorate(
  [
    Component({
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
    }),
  ],
  LocationsListComponent,
);
export { LocationsListComponent };
