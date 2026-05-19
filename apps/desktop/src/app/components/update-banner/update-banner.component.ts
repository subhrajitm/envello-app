import { Component, inject } from '@angular/core';
import { UpdateService } from '../../services/update.service';

@Component({
  selector: 'app-update-banner',
  standalone: true,
  templateUrl: './update-banner.component.html',
  styleUrl: './update-banner.component.css',
})
export class UpdateBannerComponent {
  update = inject(UpdateService);
}
