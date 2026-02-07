import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EnvLogoComponent } from '../../../shared/ui/logo/logo.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, EnvLogoComponent, ButtonComponent],
    template: `
    <div class="login-container">
      <div class="login-content">
        <!-- Logo Section -->
        <div class="login-header">
          <a routerLink="/" class="logo-link">
            <env-logo height="28px"></env-logo>
          </a>
          <h1 class="login-title">Welcome Back</h1>
          <p class="login-subtitle">Sign in to continue</p>
        </div>
        
        <!-- Login Form -->
        <form (ngSubmit)="handleLogin()" class="login-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email"
              class="form-input"
              placeholder="name@company.com"
              required
              autofocus
            >
          </div>
          
          <div class="form-group">
            <label class="form-label">Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password"
              class="form-input"
              placeholder="Enter password"
              required
            >
          </div>

          <div *ngIf="error()" class="error-message">
            <span class="material-symbols-outlined">error</span>
            <span>{{ error() }}</span>
          </div>

          <env-button 
            type="submit" 
            [loading]="loading()" 
            icon="arrow_forward" 
            iconPos="right" 
            style="width: 100%; margin-top: 4px;"
            class="w-full"
          >
            Sign In
          </env-button>

          <div class="login-footer">
            <span class="footer-text">Don't have an account?</span>
            <a routerLink="/sign-up" class="footer-link">Create Account</a>
          </div>
        </form>

        <!-- Back to Home -->
        <a routerLink="/" class="back-home-link">
          <span class="material-symbols-outlined">arrow_back</span>
          Back to Home
        </a>
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
      position: relative;
    }

    .login-content {
      width: 100%;
      max-width: 360px;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 28px 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .logo-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
      color: var(--text-primary);
      text-decoration: none;
    }

    .login-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .login-subtitle {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .form-input {
      width: 100%;
      padding: 9px 12px;
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 13px;
      transition: all 0.15s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 2px var(--accent-primary-dim);
    }

    .form-input::placeholder {
      color: var(--text-tertiary);
      font-size: 12px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.3);
      border-radius: 4px;
      color: var(--accent-red);
      font-size: 11px;
    }

    .error-message .material-symbols-outlined {
      font-size: 16px;
    }

    .login-footer {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
      margin-top: 6px;
    }

    .footer-text {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-right: 4px;
    }

    .footer-link {
      font-size: 11px;
      color: var(--accent-primary);
      text-decoration: none;
      font-weight: 600;
      transition: color 0.15s;
    }

    .footer-link:hover {
      color: var(--accent-blue);
    }

    .back-home-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 20px;
      font-size: 12px;
      color: var(--text-tertiary);
      text-decoration: none;
      transition: color 0.2s;
    }

    .back-home-link:hover {
      color: var(--text-primary);
    }

    .back-home-link .material-symbols-outlined {
      font-size: 16px;
    }
  `]
})
export class LoginComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    email = '';
    password = '';
    loading = signal(false);
    error = signal<string | null>(null);

    constructor() {
        effect(() => {
            if (this.authService.isAuthenticated()) {
                this.router.navigate(['/overview']);
            }
        });
    }

    async handleLogin() {
        if (!this.email || !this.password) {
            this.error.set('Please fill in all fields');
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        const success = await this.authService.login(this.email, this.password);

        if (success) {
            this.router.navigate(['/overview']);
        } else {
            this.error.set('Invalid credentials or login failed.');
        }
        this.loading.set(false);
    }
}
