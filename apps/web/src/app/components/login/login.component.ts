import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
// Assuming Logo and Button components are shared or available in web app
// If not, we'll use simple HTML for now or import from shared
import { EnvLogoComponent } from '../../shared/ui/logo/logo.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'app-web-login',
  standalone: true,
  imports: [CommonModule, FormsModule, EnvLogoComponent, ButtonComponent],
  template: `
    <div class="login-container">
      <div class="login-content">
        <!-- Logo Section -->
        <div class="login-header">
          <div class="logo-wrapper">
             <env-logo height="28px"></env-logo>
          </div>
          <h1 class="login-title">Envello Web</h1>
          <p class="login-subtitle">Sign in to sync your workspace</p>
        </div>
        
        <!-- Login Actions -->
        <div class="login-actions">
           <env-button 
            (clicked)="signInWithGoogle()" 
            [loading]="loading()" 
            icon="login" 
            class="w-full mb-3"
            variant="secondary"
          >
            Sign in with Google
          </env-button>

           <env-button 
            (clicked)="signInWithGithub()" 
            [loading]="loading()" 
            icon="code" 
            class="w-full"
            variant="secondary"
          >
            Sign in with GitHub
          </env-button>
        </div>

        <div *ngIf="error()" class="error-message">
            <span class="material-symbols-outlined">error</span>
            <span>{{ error() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      background: var(--bg-app);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .login-content {
      width: 100%;
      max-width: 360px;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 32px 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    .login-header {
      margin-bottom: 24px;
    }
    .login-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 12px 0 4px;
    }
    .login-subtitle {
        font-size: 13px;
        color: var(--text-tertiary);
    }
    .login-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .error-message {
      margin-top: 16px;
      padding: 8px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 4px;
      color: var(--accent-red);
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/overview']);
      }
    });
  }

  async signInWithGoogle() {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authService.signInWithGoogle();
    } catch (e: any) {
      this.error.set(e.message || 'Login failed');
      this.loading.set(false);
    }
  }

  async signInWithGithub() {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authService.signInWithGithub();
    } catch (e: any) {
      this.error.set(e.message || 'Login failed');
      this.loading.set(false);
    }
  }
}
