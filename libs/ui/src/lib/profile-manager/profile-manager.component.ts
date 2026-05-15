import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { WorkspaceProfileService, UserService, StoreService } from '@envello/core';
import { ModalComponent } from '../modal/modal.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-manager',
  standalone: true,
  imports: [CommonModule, ModalComponent, FormsModule, DatePipe, ConfirmDialogComponent],
  templateUrl: './profile-manager.component.html',
  styleUrl: './profile-manager.component.css'
})
export class ProfileManagerComponent {
  workspaceService = inject(WorkspaceProfileService);
  private storeService = inject(StoreService);
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
    const name = this.newProfileName().trim();
    if (!name) return;
    const newId = crypto.randomUUID();
    // Persist to DB first so it survives the reload triggered by switchProfile
    this.storeService.addProject({
      id: newId,
      title: name,
      description: '',
      status: 'PLANNING',
      words: 0,
      updated: new Date().toISOString(),
      icon: 'folder'
    });
    this.workspaceService.addProfileWithId(newId, name, '#3b82f6', 'folder');
    this.isAddModalOpen.set(false);
    this.workspaceService.switchProfile(newId);
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
    const name = this.editProfileName().trim();
    if (id && name) {
      this.workspaceService.updateProfile(id, { name, color: this.editProfileColor() });
      this.storeService.updateProject(id, { title: name });
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
      // Remove from PouchDB first — prevents the header sync effect from
      // re-adding the profile back on the next page load.
      this.storeService.deleteProject(id);
      this.workspaceService.removeProfile(id);
      this.cancelDelete();
    }
  }
}
