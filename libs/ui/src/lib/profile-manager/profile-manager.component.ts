import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { WorkspaceProfileService, UserService } from '@envello/core';
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
  private userService = inject(UserService);
  workspaces = this.workspaceService.profiles;
  activeWorkspace = this.workspaceService.activeProfile;
  userName = this.userService.userName;

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

  isEditModalOpen = signal(false);
  editProfileId = signal<string | null>(null);
  editProfileName = signal('');
  editProfileColor = signal('#3b82f6'); // Default

  openEditModal(wp: any) {
    this.editProfileId.set(wp.id);
    this.editProfileName.set(wp.name);
    this.editProfileColor.set(wp.color || '#3b82f6');
    this.isEditModalOpen.set(true);
  }

  cancelEdit() {
    this.isEditModalOpen.set(false);
    this.editProfileId.set(null);
  }

  confirmEdit() {
    const id = this.editProfileId();
    if (id && this.editProfileName().trim()) {
      this.workspaceService.updateProfile(id, { 
        name: this.editProfileName().trim(),
        color: this.editProfileColor()
      });
      this.cancelEdit();
    }
  }

  // Delete Modal Logic
  isDeleteModalOpen = signal(false);
  profileToDelete = signal<string | null>(null);

  openDeleteModal(id: string) {
    this.profileToDelete.set(id);
    this.isDeleteModalOpen.set(true);
  }

  cancelDelete() {
    this.isDeleteModalOpen.set(false);
    this.profileToDelete.set(null);
  }

  confirmDelete() {
    const id = this.profileToDelete();
    if (id) {
      this.workspaceService.removeProfile(id);
      this.cancelDelete();
    }
  }
}
