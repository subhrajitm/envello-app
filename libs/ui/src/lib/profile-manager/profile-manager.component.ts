import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { WorkspaceProfileService } from '@envello/core';
import { ModalComponent } from '../modal/modal.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-manager',
  standalone: true,
  imports: [CommonModule, ModalComponent, FormsModule, DatePipe],
  templateUrl: './profile-manager.component.html',
  styleUrl: './profile-manager.component.css'
})
export class ProfileManagerComponent {
  workspaceService = inject(WorkspaceProfileService);
  workspaces = this.workspaceService.profiles;
  activeWorkspace = this.workspaceService.activeProfile;

  isAddModalOpen = signal(false);
  newProfileName = signal('');

  openAddModal() {
    this.newProfileName.set('');
    this.isAddModalOpen.set(true);
  }

  cancelAdd() {
    this.isAddModalOpen.set(false);
  }

  confirmAdd() {
    if (this.newProfileName().trim()) {
      this.workspaceService.addProfile(this.newProfileName().trim());
      this.isAddModalOpen.set(false);
    }
  }

  switchWorkspace(id: string) {
    if (this.activeWorkspace().id !== id) {
      this.workspaceService.switchProfile(id);
    }
  }

  deleteWorkspace(id: string) {
    if (confirm('Are you sure you want to completely delete this profile? All its isolated data will be unrecoverable.')) {
      this.workspaceService.removeProfile(id);
    }
  }
}
