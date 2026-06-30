import { Component, signal, inject, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { UserService, WorkspaceProfileService, StoreService, NotificationService } from '@envello/core';
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
        style({ transform: 'scale(0.98)', opacity: 0 }),
        animate('180ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'scale(0.98)', opacity: 0 }))
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

  private workspaceService = inject(WorkspaceProfileService);
  private storeService = inject(StoreService);
  private notify = inject(NotificationService);

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
    if (!name) return;
    const newId = crypto.randomUUID();
    this.storeService.addSpace({
      id: newId,
      title: name,
      description: '',
      status: 'PLANNING',
      words: 0,
      updated: new Date().toISOString(),
      icon: 'folder'
    });
    this.workspaceService.addProfileWithId(newId, name, '#3b82f6', 'folder');
    this.isAddProfileModalOpen.set(false);
    this.workspaceService.switchProfile(newId);
  }

  cancelAddWorkspace() {
    this.isAddProfileModalOpen.set(false);
  }

  manageProfiles() {
    this.close();
    this.router.navigate(['/spaces']);
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
    this.close();
    this.onOpenProfile.emit();
  }

  openSettings() {
    this.close();
    this.onOpenSettings.emit();
  }

  openAnalytics() {
    this.close();
    this.router.navigate(['/analytics']);
  }

  openActivity() {
    this.close();
    this.router.navigate(['/activity-log']);
  }

  openHelp() {
    this.close();
    this.notify.info('Help & Support', 'Documentation and support resources coming soon.');
  }

  openBin() {
    this.close();
    this.router.navigate(['/bin']);
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
  handleEscape(event: Event) {
    if (this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }
}
