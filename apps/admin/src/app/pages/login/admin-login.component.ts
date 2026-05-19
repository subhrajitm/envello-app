import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { SupabaseService } from '@envello/core';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-header">
          <span class="material-symbols-outlined brand-icon">admin_panel_settings</span>
          <h1>Envello Admin</h1>
          <p>Sign in with your admin credentials</p>
        </div>

        <form (ngSubmit)="handleLogin()" class="login-form">
          <div class="field">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" placeholder="admin@example.com" required autofocus />
          </div>

          <div class="field">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" placeholder="Password" required />
          </div>

          @if (error()) {
            <div class="error-box">
              <span class="material-symbols-outlined">error</span>
              {{ error() }}
            </div>
          }

          <button type="submit" [disabled]="loading()" class="submit-btn">
            @if (loading()) {
              <span class="spinner"></span>
            } @else {
              <span class="material-symbols-outlined">login</span>
            }
            Sign In
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .login-wrap {
      min-height: 100vh;
      background: var(--bg-app, #0f0f0f);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .login-card {
      width: 100%;
      max-width: 360px;
      background: var(--bg-panel, #1a1a1a);
      border: 1px solid var(--border-subtle, #2a2a2a);
      border-radius: 8px;
      padding: 32px 28px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }

    .login-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .brand-icon {
      font-size: 36px;
      color: var(--accent-primary, #6366f1);
      display: block;
      margin-bottom: 12px;
    }

    .login-header h1 {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary, #fff);
      margin: 0 0 6px;
    }

    .login-header p {
      font-size: 12px;
      color: var(--text-tertiary, #666);
      margin: 0;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--text-secondary, #aaa);
    }

    .field input {
      padding: 9px 12px;
      background: var(--bg-app, #0f0f0f);
      border: 1px solid var(--border-subtle, #2a2a2a);
      border-radius: 4px;
      color: var(--text-primary, #fff);
      font-size: 13px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .field input:focus {
      outline: none;
      border-color: var(--accent-primary, #6366f1);
      box-shadow: 0 0 0 2px var(--accent-primary-dim, rgba(99,102,241,0.2));
    }

    .field input::placeholder {
      color: var(--text-tertiary, #555);
      font-size: 12px;
    }

    .error-box {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: rgba(248,113,113,0.1);
      border: 1px solid rgba(248,113,113,0.3);
      border-radius: 4px;
      color: #f87171;
      font-size: 12px;
    }

    .error-box .material-symbols-outlined {
      font-size: 15px;
    }

    .submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--accent-primary, #6366f1);
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .submit-btn:hover:not(:disabled) { opacity: 0.85; }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .submit-btn .material-symbols-outlined { font-size: 16px; }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AdminLoginComponent {
  private sb = inject(SupabaseService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  async handleLogin() {
    if (!this.email || !this.password) {
      this.error.set('Please fill in all fields.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.sb.client.auth.signInWithPassword({
        email: this.email,
        password: this.password,
      });

      if (error) {
        this.error.set(error.message);
        return;
      }

      // Watch next navigation — if guard bounces back to /login, show a clear message
      this.router.events.pipe(
        filter(e => e instanceof NavigationEnd),
        take(1)
      ).subscribe((e: NavigationEnd) => {
        if (e.urlAfterRedirects.startsWith('/login')) {
          this.error.set('Access denied. Your account does not have admin privileges.');
          this.loading.set(false);
        }
      });

      this.router.navigate(['/dashboard']);
    } catch {
      this.error.set('Login failed. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
