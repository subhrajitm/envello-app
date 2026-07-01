import { Component, signal, inject, output, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { UserService, WorkspaceProfileService, StoreService, NotificationService } from '@envello/core';
import { ModalComponent } from '../modal/modal.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { KeyboardShortcutsService } from '../keyboard-shortcuts/keyboard-shortcuts.service';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [FormsModule, ModalComponent, ConfirmDialogComponent],
  providers: [DatePipe],
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
  private datePipe = inject(DatePipe);

  logoutConfirm = signal(false);

  workspaces = this.workspaceService.profiles;
  activeWorkspace = this.workspaceService.activeProfile;
  switching = this.workspaceService.switching;
  canAddSpace = this.workspaceService.canAddSpace;
  maxSpaces = this.workspaceService.MAX_SPACES;

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
      icon: 'folder',
      color: '#3b82f6',
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
    this.logoutConfirm.set(true);
  }

  doLogout() {
    this.logoutConfirm.set(false);
    this.userService.logout();
  }

  openWords() {
    this.close();
    this.router.navigate(['/daily-notes']);
  }

  openDocuments() {
    this.close();
    this.router.navigate(['/write']);
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
    return this.datePipe.transform(joinedDate, 'MMM yyyy') ?? '';
  }

  getLastLogin(): string {
    const raw = this.user()?.stats?.lastLoginDate;
    if (!raw) return '';
    const date = new Date(raw);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60_000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 2) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `Today at ${this.datePipe.transform(date, 'h:mm a')}`;
    if (days === 1) return `Yesterday at ${this.datePipe.transform(date, 'h:mm a')}`;
    return this.datePipe.transform(date, 'MMM d, h:mm a') ?? '';
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: Event) {
    if (this.isOpen()) {
      event.preventDefault();
      this.close();
    }
  }
}
