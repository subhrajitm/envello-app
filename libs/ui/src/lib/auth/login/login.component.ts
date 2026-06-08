import { Component, inject, signal, effect, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, TauriService } from '@envello/core';
import { Router, RouterModule } from '@angular/router';
import { EnvLogoComponent } from '../../logo/logo.component';
import { ButtonComponent } from '../../button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EnvLogoComponent, ButtonComponent],
  template: `
    <div class="login-container">
      <div class="lines-bg">
        <canvas #linesCanvas class="lines-canvas"></canvas>
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
            @if (isTauri()) {
            <env-button variant="ghost" (clicked)="continueAsGuest()">
              Continue as Guest
            </env-button>
            <div class="footer-divider"></div>
            }

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
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      animation: fadeIn 0.3s ease-out;
      position: relative;
      z-index: 10;
    }
    
    .lines-bg {
      position: absolute;
      inset: 0;
      overflow: hidden;
      z-index: 1;
      pointer-events: none;
    }

    .lines-canvas {
      width: 100%;
      height: 100%;
      display: block;
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


  `]
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  authService = inject(AuthService);
  router = inject(Router);
  isTauri = inject(TauriService).isTauri;

  @ViewChild('linesCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private animId = 0;
  private resizeObs?: ResizeObserver;

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

  ngAfterViewInit() {
    this.startLines();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.resizeObs?.disconnect();
  }

  private startLines() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const [r, g, b] = this.accentRgb();

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (!w || !h) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    this.resizeObs = new ResizeObserver(fit);
    this.resizeObs.observe(canvas);

    const BS = 6;
    const GAP = 6;
    const STEP = BS + GAP;
    const TAIL = 14;
    const HEAD_ALPHA = 0.12;
    const BASE_ALPHA = 0.010;

    let hPos: number[]   = [];  // fractional col position per row
    let hSpeed: number[] = [];
    let vPos: number[]   = [];  // fractional row position per col
    let vSpeed: number[] = [];
    let lastRows = 0;
    let lastCols = 0;

    const initPulses = (rows: number, cols: number) => {
      hPos   = Array.from({ length: rows }, () => Math.random() * cols);
      hSpeed = Array.from({ length: rows }, () => 0.04 + Math.random() * 0.05);
      vPos   = Array.from({ length: cols }, () => Math.random() * rows);
      vSpeed = Array.from({ length: cols }, () => 0.03 + Math.random() * 0.04);
      lastRows = rows;
      lastCols = cols;
    };

    // Alpha contribution from a pulse at fractional `pos` for block at `idx`
    const contrib = (pos: number, idx: number): number => {
      const offset = pos - idx;
      if (offset < -1 || offset >= TAIL) return 0;
      if (offset < 0) return HEAD_ALPHA * (offset + 1);       // smooth entry
      return HEAD_ALPHA * Math.exp(-offset * 0.32);           // exponential tail
    };

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      const cols = Math.ceil(W / STEP) + 1;
      const rows = Math.ceil(H / STEP) + 1;

      if (rows !== lastRows || cols !== lastCols) initPulses(rows, cols);

      for (let rr = 0; rr < rows; rr++) {
        hPos[rr] += hSpeed[rr];
        if (hPos[rr] - TAIL > cols) hPos[rr] = -1;
      }
      for (let c = 0; c < cols; c++) {
        vPos[c] += vSpeed[c];
        if (vPos[c] - TAIL > rows) vPos[c] = -1;
      }

      for (let rr = 0; rr < rows; rr++) {
        for (let c = 0; c < cols; c++) {
          const ha = contrib(hPos[rr], c);
          const va = contrib(vPos[c], rr);
          const alpha = BASE_ALPHA + Math.min(ha + va, 0.85);

          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.fillRect(c * STEP, rr * STEP, BS, BS);
        }
      }

      this.animId = requestAnimationFrame(draw);
    };
    draw();
  }

  private accentRgb(): [number, number, number] {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const map: Record<string, [number, number, number]> = {
      'dark':             [255, 215,   0],
      'enterprise-dark':  [251, 191,  36],
      'light':            [180,  83,   9],
      'colorful':         [240, 125,  89],
      'typewriter':       [ 60,  60,  60],
    };
    return map[theme] ?? map['light'];
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
