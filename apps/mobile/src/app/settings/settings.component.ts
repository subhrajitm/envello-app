import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserService } from '@envello/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div class="settings">
      <header class="settings-header">
        <h1 class="settings-title">Settings</h1>
      </header>

      <div class="settings-body">
        <!-- Profile section -->
        <section class="settings-section">
          <div class="profile-card">
            <div class="avatar">
              {{ userInitial() }}
            </div>
            <div class="profile-info">
              <p class="profile-name">{{ userService.userName() }}</p>
              <p class="profile-email">{{ userService.user()?.email ?? '' }}</p>
            </div>
          </div>
        </section>

        <!-- App info -->
        <section class="settings-section">
          <h2 class="section-label">About</h2>
          <div class="settings-row">
            <span class="row-label">Version</span>
            <span class="row-value">0.1.0</span>
          </div>
          <div class="settings-row">
            <span class="row-label">Platform</span>
            <span class="row-value">Mobile</span>
          </div>
        </section>

        <!-- Account actions -->
        <section class="settings-section">
          <h2 class="section-label">Account</h2>
          <button class="danger-btn" (click)="logout()">
            <span class="material-symbols-outlined">logout</span>
            Sign out
          </button>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .settings {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      background-color: var(--bg-app);
    }

    .settings-header {
      padding: 20px 20px 8px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .settings-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .settings-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .settings-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-tertiary);
      margin: 0 0 4px;
    }

    .profile-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background-color: var(--bg-panel);
      border: 1px solid var(--border-main);
      border-radius: 12px;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: var(--accent-primary-dim);
      color: var(--accent-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .profile-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 2px;
    }

    .profile-email {
      font-size: 13px;
      color: var(--text-tertiary);
      margin: 0;
    }

    .settings-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background-color: var(--bg-panel);
      border: 1px solid var(--border-main);
      border-radius: 10px;
    }

    .row-label {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .row-value {
      font-size: 14px;
      color: var(--text-tertiary);
    }

    .danger-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 14px 16px;
      background-color: var(--bg-panel);
      border: 1px solid var(--border-main);
      border-radius: 10px;
      color: var(--accent-red);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      -webkit-tap-highlight-color: transparent;
    }

    .danger-btn .material-symbols-outlined {
      font-size: 18px;
    }
  `]
})
export class SettingsComponent {
  protected userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);

  userInitial() {
    const name = this.userService.userName();
    return name ? name[0].toUpperCase() : '?';
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
