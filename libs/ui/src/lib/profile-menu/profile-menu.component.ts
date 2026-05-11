import { Component, signal, inject, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { UserService, WorkspaceProfileService } from '@envello/core';
import { ModalComponent } from '../modal/modal.component';
import { KeyboardShortcutsService } from '../keyboard-shortcuts/keyboard-shortcuts.service';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './profile-menu.component.html',
  styleUrl: './profile-menu.component.css',
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'translateY(-10px)', opacity: 0 }))
      ])
    ])
  ]
})
export class ProfileMenuComponent {
  private userService = inject(UserService);
  private router = inject(Router);
  private kbShortcuts = inject(KeyboardShortcutsService);

  isOpen = signal(false);

  // Expose user data
  user = this.userService.user;
  userInitials = this.userService.userInitials;

  // Events
  onOpenProfile = output<void>();
  onOpenSettings = output<void>();

  workspaceService = inject(WorkspaceProfileService);
  workspaces = this.workspaceService.profiles;
  activeWorkspace = this.workspaceService.activeProfile;

  isAddProfileModalOpen = signal(false);
  newProfileName = signal('');

  switchWorkspace(id: string) {
    this.workspaceService.switchProfile(id);
  }

  addWorkspace() {
    this.newProfileName.set('');
    this.isAddProfileModalOpen.set(true);
    this.close();
  }

  confirmAddWorkspace() {
    const name = this.newProfileName().trim();
    if (name) {
      this.workspaceService.addProfile(name);
      this.isAddProfileModalOpen.set(false);
    }
  }

  cancelAddWorkspace() {
    this.isAddProfileModalOpen.set(false);
  }

  manageProfiles() {
    this.router.navigate(['/profiles']);
    this.close();
  }

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  toggle() {
    this.isOpen.set(!this.isOpen());
  }

  openProfile() {
    this.onOpenProfile.emit();
    this.close();
  }

  openSettings() {
    this.onOpenSettings.emit();
    this.close();
  }

  openActivity() {
    this.router.navigate(['/activity-log']);
    this.close();
  }

  openDeveloperSettings() {
    this.router.navigate(['/developer-settings']);
    this.close();
  }

  openHelp() {
    console.log('Opening help & support...');
    this.close();
  }

  openBin() {
    this.router.navigate(['/bin']);
    this.close();
  }

  openKeyboardShortcuts() {
    this.close();
    this.kbShortcuts.open();
  }

  toggleEmailNotifications() {
    const current = this.user()?.preferences.emailNotifications;
    this.userService.updatePreferences({
      emailNotifications: !current
    });
  }

  toggleAutoBackup() {
    const current = this.user()?.preferences.autoBackup;
    this.userService.updatePreferences({
      autoBackup: !current
    });
  }

  logout() {
    this.close();
    this.userService.logout();
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  getMemberSince(): string {
    const joinedDate = this.user()?.joinedDate;
    if (!joinedDate) return '';

    return joinedDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent) {
    if (this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }
}
