import { Component, inject, signal, effect } from '@angular/core';
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
      <div *ngIf="!authService.isAuthenticated()" class="login-content">
        <!-- Logo Section -->
        <div class="login-header">
          <div class="logo-wrapper">
            <span class="material-symbols-outlined logo-icon">nutrition</span>
            <span class="logo-text">ENVELLO</span>
          </div>
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
            <button type="button" class="btn-guest" (click)="continueAsGuest()">
              Continue as Guest
            </button>
            <div class="footer-divider"></div>
            <span class="footer-text">Don't have an account?</span>
            <a routerLink="/sign-up" class="footer-link">Create Account</a>
          </div>
        </form>
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
    
    .loading-overlay {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      width: 100%;
    }

    .loading-spinner-large {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-subtle);
      border-top-color: var(--accent-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
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

    .logo-wrapper {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
    }

    .logo-icon {
      font-size: 22px;
      color: var(--accent-primary);
    }

    .logo-text {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text-primary);
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

    .btn-primary {
      width: 100%;
      padding: 10px 20px;
      background: var(--accent-primary);
      color: var(--accent-primary-text);
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 4px;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 3px 8px var(--accent-primary-dim);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary .material-symbols-outlined {
      font-size: 16px;
    }

    .loading-spinner {
      width: 12px;
      height: 12px;
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


  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/workspace']);
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

  continueAsGuest() {
    this.authService.loginAsGuest();
  }
}
