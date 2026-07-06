import { Component, signal, inject, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, AuthService, NotificationService } from '@envello/core';
import { A11yModule } from '@angular/cdk/a11y';

type ProfileSection = 'profile' | 'account' | 'security';

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, A11yModule],
  templateUrl: './profile-editor.component.html',
  styleUrl: './profile-editor.component.css',
})
export class ProfileEditorComponent {
  private readonly userService   = inject(UserService);
  private readonly authService   = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router        = inject(Router);

  readonly user         = this.userService.user;
  readonly userInitials = this.userService.userInitials;

  isOpen          = signal(false);
  activeSection   = signal<ProfileSection>('profile');
  isSaving        = signal(false);

  // ── Profile section ──────────────────────────────────────────────────────
  tempName       = '';
  tempBio        = '';
  tempGender     = signal<'male' | 'female'>('male');
  tempAvatar     = signal<string | undefined>(undefined);
  tempCustomUrl  = signal('');
  isGravatar     = signal(false);
  isImageLoading = signal(false);

  readonly BIO_MAX = 200;

  readonly isProfileValid = computed(() =>
    this.tempName.trim().length > 0 && this.tempBio.length <= this.BIO_MAX
  );

  // ── Account section ───────────────────────────────────────────────────────
  expandedAction = signal<'email' | 'password' | null>(null);

  // Change email
  newEmail        = signal('');
  emailError      = signal('');
  isSavingEmail   = signal(false);

  // Change password
  newPassword     = signal('');
  confirmPassword = signal('');
  passwordError   = signal('');
  isSavingPassword = signal(false);
  showNewPassword = signal(false);

  readonly currentEmail = computed(() => this.authService.currentUser()?.email ?? '');

  // ── Lifecycle ────────────────────────────────────────────────────────────

  open() {
    const u = this.user();
    if (u) {
      this.tempName = u.name;
      this.tempBio  = u.bio ?? '';
      this.tempGender.set(u.preferences?.gender ?? 'male');
      this.tempCustomUrl.set('');
      this.isGravatar.set(false);
      if (u.avatar) {
        this.isImageLoading.set(true);
        this.tempAvatar.set(u.avatar);
      } else {
        this.isImageLoading.set(false);
        this.tempAvatar.set(undefined);
      }
    }
    this.activeSection.set('profile');
    this.expandedAction.set(null);
    this.resetAccountForms();
    this.isOpen.set(true);
  }

  close() { this.isOpen.set(false); }

  setSection(s: ProfileSection) {
    this.activeSection.set(s);
    this.expandedAction.set(null);
    this.resetAccountForms();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.isOpen()) this.close(); }

  // ── Avatar helpers ────────────────────────────────────────────────────────

  setAvatarOption(option: 'male' | 'female' | 'initials') {
    if (option === 'initials') {
      this.isImageLoading.set(false);
      this.tempAvatar.set(undefined);
    } else {
      this.isImageLoading.set(true);
      this.tempGender.set(option);
      this.tempAvatar.set(this.userService.getAvatarForGender(option));
    }
  }

  onImageLoad()  { this.isImageLoading.set(false); }
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
    const data = new TextEncoder().encode(email.toLowerCase().trim());
    const buf  = await crypto.subtle.digest('SHA-256', data);
    const hex  = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    const url  = `https://www.gravatar.com/avatar/${hex}?size=200&default=mp`;
    this.isImageLoading.set(true);
    this.isGravatar.set(true);
    this.tempCustomUrl.set(url);
    this.tempAvatar.set(url);
  }

  // ── Save profile ──────────────────────────────────────────────────────────

  async saveProfile() {
    if (!this.isProfileValid() || this.isSaving()) return;
    this.isSaving.set(true);
    try {
      await Promise.all([
        this.userService.updateProfile({ name: this.tempName, bio: this.tempBio, avatar: this.tempAvatar() }),
        this.userService.updatePreferences({ gender: this.tempGender() }),
      ]);
      this.notifications.success('Profile Updated', 'Your changes have been saved.');
      this.close();
    } catch {
      this.notifications.error('Save Failed', 'Could not update profile. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  // ── Account actions ───────────────────────────────────────────────────────

  toggleAction(action: 'email' | 'password') {
    this.expandedAction.set(this.expandedAction() === action ? null : action);
    this.resetAccountForms();
  }

  async saveEmail() {
    const email = this.newEmail().trim();
    if (!email || !email.includes('@')) { this.emailError.set('Enter a valid email address.'); return; }
    if (email === this.currentEmail())  { this.emailError.set('That\'s already your current email.'); return; }
    this.isSavingEmail.set(true);
    this.emailError.set('');
    try {
      await this.authService.updateEmail(email);
      this.notifications.success('Confirmation sent', 'Check your new inbox to confirm the change.');
      this.expandedAction.set(null);
      this.newEmail.set('');
    } catch (e: any) {
      this.emailError.set(e?.message ?? 'Could not update email.');
    } finally {
      this.isSavingEmail.set(false);
    }
  }

  async savePassword() {
    if (this.newPassword().length < 8) { this.passwordError.set('Password must be at least 8 characters.'); return; }
    if (this.newPassword() !== this.confirmPassword()) { this.passwordError.set('Passwords do not match.'); return; }
    this.isSavingPassword.set(true);
    this.passwordError.set('');
    try {
      await this.authService.updatePassword(this.newPassword());
      this.notifications.success('Password Updated', 'Your password has been changed.');
      this.expandedAction.set(null);
      this.newPassword.set('');
      this.confirmPassword.set('');
    } catch (e: any) {
      this.passwordError.set(e?.message ?? 'Could not update password.');
    } finally {
      this.isSavingPassword.set(false);
    }
  }

  openSecuritySettings() {
    this.close();
    this.router.navigate(['/settings'], { queryParams: { section: 'security' } });
  }

  private resetAccountForms() {
    this.newEmail.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.emailError.set('');
    this.passwordError.set('');
    this.isSavingEmail.set(false);
    this.isSavingPassword.set(false);
    this.showNewPassword.set(false);
  }
}
