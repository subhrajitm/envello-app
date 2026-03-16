import { __decorate } from 'tslib';
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@envello/core';
import { Router, RouterModule } from '@angular/router';
import { EnvLogoComponent } from '../../logo/logo.component';
import { ButtonComponent } from '../../button/button.component';
let LoginComponent = class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);
  email = '';
  password = '';
  loading = signal(false);
  error = signal(null);
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
};
LoginComponent = __decorate(
  [
    Component({
      selector: 'app-login',
      standalone: true,
      imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        EnvLogoComponent,
        ButtonComponent,
      ],
      template: `
    <div class="login-container">
      <div class="wave-bg">
        <svg class="waves" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
        viewBox="0 24 150 28" preserveAspectRatio="none" shape-rendering="auto">
          <defs>
            <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
          </defs>
          <g class="parallax">
            <use xlink:href="#gentle-wave" x="48" y="0" />
            <use xlink:href="#gentle-wave" x="48" y="3" />
            <use xlink:href="#gentle-wave" x="48" y="5" />
            <use xlink:href="#gentle-wave" x="48" y="7" />
          </g>
        </svg>
      </div>
      
      <div *ngIf="!authService.isAuthenticated()" class="login-content">
        <!-- Logo Section -->
        <div class="login-header">
          <div class="logo-wrapper">
            <env-logo height="28px"></env-logo>
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
            <env-button variant="ghost" (clicked)="continueAsGuest()">
              Continue as Guest
            </env-button>
            <div class="footer-divider"></div>
            <span class="footer-text">Don't have an account?</span>
            <a routerLink="/sign-up" class="footer-link">Create Account</a>
          </div>
        </form>
      </div>
    </div>
  `,
      styles: [
        `
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
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      animation: fadeIn 0.3s ease-out;
      position: relative;
      z-index: 10;
    }
    
    .wave-bg {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 35vh;
      min-height: 200px;
      overflow: hidden;
      z-index: 1;
      pointer-events: none;
    }
    
    .waves {
      position: absolute;
      bottom: 0;
      width: 100%;
      height: 100%;
      min-height: 100px;
      max-height: 250px;
    }
    
    .parallax > use {
      animation: move-forever 25s cubic-bezier(.55,.5,.45,.5) infinite;
    }
    .parallax > use:nth-child(1) {
      animation-delay: -2s;
      animation-duration: 7s;
      fill: var(--text-tertiary);
      opacity: 0.1;
    }
    .parallax > use:nth-child(2) {
      animation-delay: -3s;
      animation-duration: 10s;
      fill: var(--accent-primary-dim);
      opacity: 0.2;
    }
    .parallax > use:nth-child(3) {
      animation-delay: -4s;
      animation-duration: 13s;
      fill: var(--accent-primary);
      opacity: 0.15;
    }
    .parallax > use:nth-child(4) {
      animation-delay: -5s;
      animation-duration: 20s;
      fill: var(--accent-primary);
      opacity: 0.3;
    }
    
    @keyframes move-forever {
      0% { transform: translate3d(-90px, 0, 0); }
      100% { transform: translate3d(85px, 0, 0); }
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


  `,
      ],
    }),
  ],
  LoginComponent,
);
export { LoginComponent };
