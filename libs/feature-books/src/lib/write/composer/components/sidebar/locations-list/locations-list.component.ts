import { Component, input, output, signal, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@envello/core';

@Component({
  selector: 'app-locations-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './locations-list.component.html',
  styleUrls: [
    './locations-list.component.css',
    '../../../composer.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class LocationsListComponent {
  locations = input.required<Location[]>();
  selectedLocationId = input.required<string | null>();
  showHeader = input<boolean>(true);

  selectLocation = output<string>();
  deleteLocation = output<{ id: string; name?: string }>();
  addNewLocation = output<void>();
  renameLocation = output<{ id: string; name: string }>();

  renamingId = signal<string | null>(null);
  renameValue = signal('');

  startRename(loc: Location, event: Event) {
    event.stopPropagation();
    this.renamingId.set(loc.id);
    this.renameValue.set(loc.name);
  }

  commitRename(id: string) {
    const name = this.renameValue().trim();
    if (name) this.renameLocation.emit({ id, name });
    this.renamingId.set(null);
  }

  cancelRename() {
    this.renamingId.set(null);
  }
}
