import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="login-container">
      <div class="login-content">
        <!-- Logo Section -->
        <div class="login-header">
          <div class="logo-wrapper">
            <span class="material-symbols-outlined logo-icon">nutrition</span>
            <span class="logo-text">ENVELLO</span>
          </div>
          <h1 class="login-title">Welcome Back</h1>
          <p class="login-subtitle">Sign in to your workspace</p>
        </div>
        
        <!-- Login Form -->
        <form (ngSubmit)="handleLogin()" class="login-form">
          <div class="form-group">
            <label class="form-label">Email Address</label>
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
              placeholder="Enter your password"
              required
            >
          </div>

          <div *ngIf="error()" class="error-message">
            <span class="material-symbols-outlined">error</span>
            <span>{{ error() }}</span>
          </div>

          <button 
            type="submit" 
            [disabled]="loading()"
            class="btn-primary"
          >
            <span *ngIf="loading()">
              <span class="loading-spinner"></span>
              Signing in...
            </span>
            <span *ngIf="!loading()">
              Sign In
              <span class="material-symbols-outlined">arrow_forward</span>
            </span>
          </button>

          <div class="login-footer">
            <span class="footer-text">Don't have an account?</span>
            <a routerLink="/sign-up" class="footer-link">Create Account</a>
          </div>
        </form>
      </div>

      <!-- Footer Info -->
      <div class="page-footer">
        <div class="footer-status">
          <span class="status-dot"></span>
          <span>Secure Connection</span>
        </div>
        <div class="footer-version">v2.0.4</div>
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
      padding: 24px;
      position: relative;
    }

    .login-content {
      width: 100%;
      max-width: 420px;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 48px 40px;
    }

    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-wrapper {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .logo-icon {
      font-size: 28px;
      color: var(--accent-primary);
    }

    .logo-text {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1px;
      color: var(--text-primary);
    }

    .login-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .login-subtitle {
      font-size: 14px;
      color: var(--text-tertiary);
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px var(--accent-primary-dim);
    }

    .form-input::placeholder {
      color: var(--text-tertiary);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.3);
      border-radius: 6px;
      color: var(--accent-red);
      font-size: 13px;
    }

    .error-message .material-symbols-outlined {
      font-size: 18px;
    }

    .btn-primary {
      width: 100%;
      padding: 14px 24px;
      background: var(--accent-primary);
      color: var(--accent-primary-text);
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px var(--accent-primary-dim);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary .material-symbols-outlined {
      font-size: 18px;
    }

    .loading-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--accent-primary-text);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .login-footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid var(--border-subtle);
      margin-top: 8px;
    }

    .footer-text {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-right: 6px;
    }

    .footer-link {
      font-size: 13px;
      color: var(--accent-primary);
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }

    .footer-link:hover {
      color: var(--accent-blue);
    }

    .page-footer {
      position: fixed;
      bottom: 24px;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      font-size: 11px;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .footer-status {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background: var(--accent-green);
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  async handleLogin() {
    if (!this.email || !this.password) {
      this.error.set('Please fill in all fields');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const success = await this.authService.login(this.email, this.password);

    if (success) {
      // Router navigation handled by auth state subscription or manually here
    } else {
      this.error.set('Invalid credentials or login failed.');
    }
    this.loading.set(false);
  }

  async handleSignUp() {
    if (!this.email || !this.password) {
      this.error.set('Please fill in all fields to sign up');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const success = await this.authService.signUp(this.email, this.password);

    if (success) {
      this.error.set('Account created! Please check your email to verify.');
    } else {
      this.error.set('Sign up failed. Please try again.');
    }
    this.loading.set(false);
  }
}
