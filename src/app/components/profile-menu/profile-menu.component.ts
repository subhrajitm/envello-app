import { Component, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule],
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

  isOpen = signal(false);

  // Expose user data
  user = this.userService.user;
  userInitials = this.userService.userInitials;

  // Events
  onOpenProfile = output<void>();
  onOpenSettings = output<void>();

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

  openHelp() {
    console.log('Opening help & support...');
    this.close();
  }

  openBin() {
    this.router.navigate(['/bin']);
    this.close();
  }

  openKeyboardShortcuts() {
    console.log('Opening keyboard shortcuts...');
    this.close();
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
}
