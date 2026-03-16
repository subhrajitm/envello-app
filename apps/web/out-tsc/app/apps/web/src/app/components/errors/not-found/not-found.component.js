import { __decorate } from 'tslib';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
let NotFoundComponent = class NotFoundComponent {};
NotFoundComponent = __decorate(
  [
    Component({
      selector: 'app-not-found',
      standalone: true,
      imports: [CommonModule, RouterLink],
      templateUrl: './not-found.component.html',
      styleUrl: './not-found.component.css',
    }),
  ],
  NotFoundComponent,
);
export { NotFoundComponent };
