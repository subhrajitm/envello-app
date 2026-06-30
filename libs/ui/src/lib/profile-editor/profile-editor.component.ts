import { Component, signal, inject, ViewChild, ElementRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '@envello/core';
import { NotificationService } from '@envello/core';
import { ButtonComponent } from '../button/button.component';
import { ModalComponent } from '../modal/modal.component';

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
  tempGender = signal<'male' | 'female'>('male');
  tempCustomUrl = signal('');
  isGravatar = signal(false);

  isSaving = signal(false);
  isImageLoading = signal(false);

  readonly BIO_MAX = 200;

  get isValid(): boolean {
    return this.tempName.trim().length > 0 && this.tempBio.length <= this.BIO_MAX;
  }

  open() {
    const currentUser = this.user();
    if (currentUser) {
      this.tempName = currentUser.name;
      this.tempBio = currentUser.bio || '';
      this.tempGender.set(currentUser.preferences.gender || 'male');
      this.tempCustomUrl.set('');
      this.isGravatar.set(false);

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
      this.tempGender.set(option);
      this.tempAvatar.set(this.userService.getAvatarForGender(option));
    }
  }

  onImageLoad() {
    this.isImageLoading.set(false);
  }

  onImageError() {
    this.isImageLoading.set(false);
    this.tempAvatar.set(undefined);
    this.tempCustomUrl.set('');
    this.isGravatar.set(false);
  }

  applyCustomUrl() {
    const url = this.tempCustomUrl().trim();
    if (!url) return;
    this.isImageLoading.set(true);
    this.isGravatar.set(false);
    this.tempAvatar.set(url);
  }

  async useGravatar() {
    const email = this.user()?.email;
    if (!email) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const url = `https://www.gravatar.com/avatar/${hex}?size=200&default=mp`;
    this.isImageLoading.set(true);
    this.isGravatar.set(true);
    this.tempCustomUrl.set(url);
    this.tempAvatar.set(url);
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
          gender: this.tempGender()
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
