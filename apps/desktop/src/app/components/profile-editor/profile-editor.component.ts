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

  // Avatar Configuration State
  tempAvatarType: 'image' | 'initials' = 'image';
  tempGender: 'male' | 'female' = 'male';
  tempAge: 'young' | 'adult' | 'senior' = 'adult';
  tempPersonality: 'professional' | 'casual' | 'fun' = 'professional';
  tempVariant: number = 1;
  tempInitialsColor: string = '#0ea5e9';

  readonly colors = ['#0ea5e9', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#1f2937'];

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

      // Load Preferences
      const prefs = currentUser.preferences;
      this.tempAvatarType = prefs.avatarType || 'image';
      this.tempGender = prefs.gender || 'male';
      this.tempAge = prefs.ageGroup || 'adult';
      this.tempPersonality = prefs.personality || 'professional';
      this.tempVariant = prefs.avatarVariant || 1;
      this.tempInitialsColor = prefs.initialsColor || '#0ea5e9';
    }
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  setType(type: 'image' | 'initials') {
    this.tempAvatarType = type;
    this.updatePreview();
  }

  setGender(gender: 'male' | 'female') {
    this.tempGender = gender;
    this.updatePreview();
  }

  setAge(age: 'young' | 'adult' | 'senior') {
    this.tempAge = age;
    this.updatePreview();
  }

  setPersonality(p: 'professional' | 'casual' | 'fun') {
    this.tempPersonality = p;
    this.updatePreview();
  }

  cycleVariant(direction: -1 | 1) {
    let newVariant = this.tempVariant + direction;
    if (newVariant < 1) newVariant = 5;
    if (newVariant > 5) newVariant = 1;
    this.tempVariant = newVariant;
    this.updatePreview();
  }

  setColor(color: string) {
    this.tempInitialsColor = color;
    this.updatePreview();
  }

  private updatePreview() {
    this.tempAvatar = this.userService.generateAvatarUrl({
      type: this.tempAvatarType,
      name: this.tempName || 'User',
      gender: this.tempGender,
      ageGroup: this.tempAge,
      personality: this.tempPersonality,
      variant: this.tempVariant,
      color: this.tempInitialsColor
    });
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
          gender: this.tempGender,
          avatarType: this.tempAvatarType,
          ageGroup: this.tempAge,
          personality: this.tempPersonality,
          avatarVariant: this.tempVariant,
          initialsColor: this.tempInitialsColor
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
