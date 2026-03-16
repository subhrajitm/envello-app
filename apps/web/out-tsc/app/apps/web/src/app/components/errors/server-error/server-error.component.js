import { __decorate } from 'tslib';
import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
let ServerErrorComponent = class ServerErrorComponent {
  route = inject(ActivatedRoute);
  message =
    this.route.snapshot.queryParamMap.get('message') ??
    'Something went wrong. Please try again later.';
};
ServerErrorComponent = __decorate(
  [
    Component({
      selector: 'app-server-error',
      standalone: true,
      imports: [CommonModule, RouterLink],
      templateUrl: './server-error.component.html',
      styleUrl: './server-error.component.css',
    }),
  ],
  ServerErrorComponent,
);
export { ServerErrorComponent };
