import { Component, signal, inject, ViewChild, ElementRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '@envello/core';
import { NotificationService } from '@envello/core';
import { ButtonComponent, ModalComponent } from '@envello/ui';

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
  tempAvatar = signal<string | undefined>(undefined);
  tempGender: 'male' | 'female' = 'male';

  isSaving = signal(false);
  isImageLoading = signal(false);

  get isValid(): boolean {
    return this.tempName.trim().length > 0;
  }

  open() {
    const currentUser = this.user();
    if (currentUser) {
      this.tempName = currentUser.name;
      this.tempBio = currentUser.bio || '';
      this.tempGender = currentUser.preferences.gender || 'male';

      // Set loading state FIRST, then avatar to prevent flash
      if (currentUser.avatar) {
        this.isImageLoading.set(true);
        this.tempAvatar.set(currentUser.avatar);
      } else {
        this.isImageLoading.set(false);
        this.tempAvatar.set(undefined);
      }
    }
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  setAvatarOption(option: 'male' | 'female' | 'initials') {
    if (option === 'initials') {
      this.isImageLoading.set(false);
      this.tempAvatar.set(undefined);
    } else {
      // Set loading FIRST, then change avatar
      this.isImageLoading.set(true);
      this.tempGender = option;
      this.tempAvatar.set(this.userService.getAvatarForGender(option));
    }
  }

  onImageLoad() {
    this.isImageLoading.set(false);
  }

  onImageError() {
    // If image fails to load, fall back to initials
    this.isImageLoading.set(false);
    this.tempAvatar.set(undefined);
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
          avatar: this.tempAvatar()
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
