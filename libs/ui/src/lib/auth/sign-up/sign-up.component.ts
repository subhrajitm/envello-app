import { Component, inject, signal, effect, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@envello/core';
import { UserService } from '@envello/core';
import { EnvLogoComponent } from '../../logo/logo.component';
import { ButtonComponent } from '../../button/button.component';
import { InputComponent } from '../../input/input.component';

@Component({
    selector: 'app-sign-up',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, EnvLogoComponent],
    templateUrl: './sign-up.component.html',
    styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent implements AfterViewInit, OnDestroy {
    authService = inject(AuthService);
    private userService = inject(UserService);
    private router = inject(Router);

    @ViewChild('linesCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    private animId = 0;
    private resizeObs?: ResizeObserver;

    constructor() {
        effect(() => {
            if (this.authService.isAuthenticated()) {
                this.router.navigate(['/workspace']);
            }
        });
    }

    ngAfterViewInit() { this.startLines(); }

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

        let hPos: number[] = [], hSpeed: number[] = [];
        let vPos: number[] = [], vSpeed: number[] = [];
        let lastRows = 0, lastCols = 0;

        const initPulses = (rows: number, cols: number) => {
            hPos   = Array.from({ length: rows }, () => Math.random() * cols);
            hSpeed = Array.from({ length: rows }, () => 0.04 + Math.random() * 0.05);
            vPos   = Array.from({ length: cols }, () => Math.random() * rows);
            vSpeed = Array.from({ length: cols }, () => 0.03 + Math.random() * 0.04);
            lastRows = rows; lastCols = cols;
        };

        const contrib = (pos: number, idx: number): number => {
            const offset = pos - idx;
            if (offset < -1 || offset >= TAIL) return 0;
            if (offset < 0) return HEAD_ALPHA * (offset + 1);
            return HEAD_ALPHA * Math.exp(-offset * 0.32);
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
                    const alpha = BASE_ALPHA + Math.min(contrib(hPos[rr], c) + contrib(vPos[c], rr), 0.85);
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
            'enterprise-light': [245, 158,  11],
        };
        return map[theme] ?? map['light'];
    }

    currentStep = signal(1);
    totalSteps = 3;

    // Form Data
    formData = {
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'Writer', // Default
        preferences: {
            emailNotifications: true,
            autoBackup: true
        }
    };

    loading = signal(false);
    error = signal<string | null>(null);

    steps = [
        { number: 1, title: 'Credentials', status: 'active' },
        { number: 2, title: 'Personal Info', status: 'pending' },
        { number: 3, title: 'Preferences', status: 'pending' }
    ];

    nextStep() {
        if (this.currentStep() < this.totalSteps) {
            if (this.validateStep(this.currentStep())) {
                this.currentStep.set(this.currentStep() + 1);
                this.updateStepStatuses();
            }
        } else {
            this.completeSignUp();
        }
    }

    prevStep() {
        if (this.currentStep() > 1) {
            this.currentStep.set(this.currentStep() - 1);
            this.updateStepStatuses();
        }
    }

    selectRole(role: string) {
        this.formData.role = role;
    }

    updateStepStatuses() {
        this.steps = this.steps.map(step => {
            if (step.number < this.currentStep()) {
                return { ...step, status: 'completed' };
            } else if (step.number === this.currentStep()) {
                return { ...step, status: 'active' };
            } else {
                return { ...step, status: 'pending' };
            }
        });
    }

    validateStep(step: number): boolean {
        this.error.set(null);
        if (step === 1) {
            if (!this.formData.email || !this.formData.password) {
                this.error.set('Please fill in all fields.');
                return false;
            }
            if (this.formData.password !== this.formData.confirmPassword) {
                this.error.set('Passwords do not match.');
                return false;
            }
            if (this.formData.password.length < 6) {
                this.error.set('Password must be at least 6 characters.');
                return false;
            }
        } else if (step === 2) {
            if (!this.formData.fullName) {
                this.error.set('Please enter your full name.');
                return false;
            }
        }
        return true;
    }

    async completeSignUp() {
        this.loading.set(true);
        this.error.set(null);

        // 1. Create Auth User
        const success = await this.authService.signUp(this.formData.email, this.formData.password);

        if (success) {
            // 2. Wait a bit for the session or user to be established if needed, 
            // but AuthService.signUp usually returns true if the request was sent.
            // However, we effectively need to update the profile *after* account creation.
            // Since SignUp usually signs in automatically (or we might need to verify email),
            // we'll assume for this flow we can proceed. 
            // Note: Supabase might require email confirmation unless disabled. 
            // If email confirmation is ON, we can't create profile immediately if RLS requires uid().
            // For this implementation, we assume we can proceed or we show a success message.

            // We will try to update the profile via UserService if we are logged in.
            // If email verification is required, this part might fail until they verify.

            // For now, let's treat success as "Check your email" or "Welcome"
            // If auto-login is enabled in Supabase config:
            setTimeout(async () => {
                // Attempt to update profile with specific data
                if (this.authService.isAuthenticated()) {
                    await this.userService.updateProfile({
                        name: this.formData.fullName,
                        role: this.formData.role,
                        preferences: {
                            ...this.userService.user()!.preferences, // keep defaults
                            emailNotifications: this.formData.preferences.emailNotifications,
                            autoBackup: this.formData.preferences.autoBackup
                        }
                    });
                    this.router.navigate(['/workspace']);
                } else {
                    // Likely email verification needed
                    this.error.set('Account created! Please verify your email before logging in.');
                    // Go to login after delay?
                }
                this.loading.set(false);
            }, 1000);

        } else {
            this.error.set('Sign up failed. Please try again or use a different email.');
            this.loading.set(false);
        }
    }
}
