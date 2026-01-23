import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BinService } from '../../services/bin.service';

@Component({
  selector: 'app-bin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bin.component.html',
  styleUrl: './bin.component.css'
})
export class BinComponent {
  private binService = inject(BinService);

  items = this.binService.items;

  permanentlyDelete(id: string) {
    this.binService.permanentlyDelete(id);
  }

  emptyBin() {
    this.binService.emptyBin();
  }
}

