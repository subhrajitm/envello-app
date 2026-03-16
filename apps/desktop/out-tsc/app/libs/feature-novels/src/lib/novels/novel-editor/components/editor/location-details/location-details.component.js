import { __decorate } from 'tslib';
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
let LocationDetailsComponent = class LocationDetailsComponent {
  location = input(null);
  updateField = output();
  addNewLocation = output();
};
LocationDetailsComponent = __decorate(
  [
    Component({
      selector: 'app-location-details',
      standalone: true,
      imports: [CommonModule],
      templateUrl: './location-details.component.html',
      styleUrls: [
        './location-details.component.css',
        '../../../novel-editor.component.css',
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
    }),
  ],
  LocationDetailsComponent,
);
export { LocationDetailsComponent };
