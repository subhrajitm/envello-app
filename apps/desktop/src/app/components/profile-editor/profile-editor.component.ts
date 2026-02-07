import { Component, signal, inject, ViewChild, ElementRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { ButtonComponent, ModalComponent } from '../../shared/ui';

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, ModalComponent],
  templateUrl: './profile-editor.component.html',
  styleUrl: './profile-editor.component.css'
})
export class ProfileEditorComponent {
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private ngZone = inject(NgZone);

  isOpen = signal(false);

  user = this.userService.user;
  userInitials = this.userService.userInitials;

  // Temp state for editing
  tempName = '';
  tempBio = '';
  tempAvatar: string | undefined = undefined;
  tempGender: 'male' | 'female' = 'male';

  isSaving = signal(false);

  get isValid(): boolean {
    return this.tempName.trim().length > 0;
  }

  open() {
    const currentUser = this.user();
    if (currentUser) {
      this.tempName = currentUser.name;
      this.tempBio = currentUser.bio || '';
      this.tempAvatar = currentUser.avatar;
      this.tempGender = currentUser.preferences.gender || 'male';
    }
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  setGender(gender: 'male' | 'female') {
    this.tempGender = gender;
    this.tempAvatar = this.userService.getAvatarForGender(gender);
  }

  async save() {
    if (!this.isValid || this.isSaving()) return;

    this.isSaving.set(true);
    try {
      // Save Profile & Preferences
      await Promise.all([
        this.userService.updateProfile({
          name: this.tempName,
          bio: this.tempBio,
          avatar: this.tempAvatar
        }),
        this.userService.updatePreferences({
          gender: this.tempGender
        })
      ]);

      this.notificationService.success('Profile Updated', 'Your changes have been saved successfully.');
      this.close();
    } catch (e) {
      console.error('Failed to save profile:', e);
      this.notificationService.error('Save Failed', 'Could not update profile. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: Event) {
    if (this.isOpen()) {
      (event as KeyboardEvent).preventDefault();
      this.close();
    }
  }
}
