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
      <!-- Wavy Background -->
      <div class="waves-bg">
        <svg class="waves" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
        viewBox="0 24 150 28" preserveAspectRatio="none" shape-rendering="auto">
          <defs>
            <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
          </defs>
          <g class="parallax">
            <use xlink:href="#gentle-wave" x="48" y="0" fill="rgba(59, 130, 246, 0.7)" />
            <use xlink:href="#gentle-wave" x="48" y="3" fill="rgba(59, 130, 246, 0.5)" />
            <use xlink:href="#gentle-wave" x="48" y="5" fill="rgba(59, 130, 246, 0.3)" />
            <use xlink:href="#gentle-wave" x="48" y="7" fill="rgba(59, 130, 246, 0.1)" />
          </g>
        </svg>
      </div>

      <div class="login-content">
        <!-- Logo Section -->
        <div class="login-header">
          <a routerLink="/" class="logo-link">
            <env-logo height="28px"></env-logo>
          </a>
          <h1 class="login-title">Welcome Back</h1>
          <p class="login-subtitle">Sign in to continue to Envello</p>
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
      background: var(--bg-app, #0f172a); /* Fallback to dark bg */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      position: relative;
      overflow: hidden;
    }

    /* Wavy Background Styles */
    .waves-bg {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 20vh; /* Adjust height of waves */
        z-index: 0;
        pointer-events: none;
    }

    .waves {
        position: relative;
        width: 100%;
        height: 100px;
        margin-bottom: -7px; /* Fix for safari gap */
        min-height: 100px;
        max-height: 150px;
    }

    /* Animation */
    .parallax > use {
        animation: move-forever 25s cubic-bezier(.55,.5,.45,.5) infinite;
    }
    .parallax > use:nth-child(1) {
        animation-delay: -2s;
        animation-duration: 7s;
    }
    .parallax > use:nth-child(2) {
        animation-delay: -3s;
        animation-duration: 10s;
    }
    .parallax > use:nth-child(3) {
        animation-delay: -4s;
        animation-duration: 13s;
    }
    .parallax > use:nth-child(4) {
        animation-delay: -5s;
        animation-duration: 20s;
    }
    @keyframes move-forever {
        0% {
        transform: translate3d(-90px,0,0);
        }
        100% { 
        transform: translate3d(85px,0,0);
        }
    }

    .login-content {
      width: 100%;
      max-width: 360px;
      background: var(--bg-panel, #1e293b);
      border: 1px solid var(--border-subtle, #334155);
      border-radius: 12px; /* Soften corners */
      padding: 28px 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      animation: fadeIn 0.5s ease-out;
      position: relative;
      z-index: 1; /* Ensure card is above waves */
      backdrop-filter: blur(8px); /* Glassmorphism effect */
      background: rgba(30, 41, 59, 0.8); /* Semi-transparent background */
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
      color: var(--text-primary, #f8fafc);
      text-decoration: none;
    }

    .login-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary, #f8fafc);
      margin-bottom: 4px;
    }

    .login-subtitle {
      font-size: 13px;
      color: var(--text-tertiary, #94a3b8);
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary, #cbd5e1);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--border-subtle, #334155);
      border-radius: 6px;
      color: var(--text-primary, #f8fafc);
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent-primary, #3b82f6);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .form-input::placeholder {
      color: var(--text-tertiary, #64748b);
      font-size: 13px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 6px;
      color: #ef4444;
      font-size: 12px;
    }

    .error-message .material-symbols-outlined {
      font-size: 18px;
    }

    .login-footer {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle, #334155);
      margin-top: 8px;
    }

    .footer-text {
      font-size: 12px;
      color: var(--text-tertiary, #94a3b8);
      margin-right: 4px;
    }

    .footer-link {
      font-size: 12px;
      color: var(--accent-primary, #3b82f6);
      text-decoration: none;
      font-weight: 600;
      transition: color 0.15s;
    }

    .footer-link:hover {
      color: var(--accent-blue, #60a5fa);
      text-decoration: underline;
    }

    .back-home-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 24px;
      font-size: 13px;
      color: var(--text-tertiary, #94a3b8);
      text-decoration: none;
      transition: color 0.2s;
    }

    .back-home-link:hover {
      color: var(--text-primary, #f8fafc);
    }

    .back-home-link .material-symbols-outlined {
      font-size: 18px;
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

        // Simulate network delay for UX
        await new Promise(resolve => setTimeout(resolve, 800));

        const success = await this.authService.login(this.email, this.password);

        if (success) {
            this.router.navigate(['/overview']);
        } else {
            this.error.set('Invalid credentials or login failed.');
        }
        this.loading.set(false);
    }
}
