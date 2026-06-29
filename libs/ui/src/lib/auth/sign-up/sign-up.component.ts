import { Component, inject, signal, effect, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@envello/core';
import { UserService } from '@envello/core';
import { EnvLogoComponent } from '../../logo/logo.component';

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
        clearInterval(this.resendTimer);
    }

    private startLines() {
        const canvas = this.canvasRef?.nativeElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const [r, g, b] = this.accentRgb();
        const tmp = document.createElement('div');
        document.body.appendChild(tmp);
        tmp.style.background = 'var(--bg-app)';
        const bgColor = getComputedStyle(tmp).backgroundColor || '#ffffff';
        document.body.removeChild(tmp);

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
        let fitTimer: ReturnType<typeof setTimeout>;
        this.resizeObs = new ResizeObserver(() => {
            clearTimeout(fitTimer);
            fitTimer = setTimeout(fit, 50);
        });
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
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, W, H);

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
            'typewriter':       [ 60,  60,  60],
        };
        return map[theme] ?? map['light'];
    }

    currentStep = signal(1);
    totalSteps = 4;

    // Form Data
    formData = {
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'Productivity',
        preferences: {
            emailNotifications: true,
            autoBackup: true
        }
    };

    verificationCode = signal('');
    resendCooldown = signal(0);
    private resendTimer?: ReturnType<typeof setInterval>;

    loading = signal(false);
    error = signal<string | null>(null);

    steps = [
        { number: 1, title: 'Credentials', status: 'active' },
        { number: 2, title: 'Personal Info', status: 'pending' },
        { number: 3, title: 'Preferences', status: 'pending' },
        { number: 4, title: 'Verify Email', status: 'pending' },
    ];

    nextStep() {
        if (this.currentStep() === this.totalSteps) {
            this.verifyAndComplete();
            return;
        }
        if (!this.validateStep(this.currentStep())) return;
        if (this.currentStep() === 3) {
            this.initiateSignUp();
        } else {
            this.currentStep.set(this.currentStep() + 1);
            this.updateStepStatuses();
        }
    }

    prevStep() {
        if (this.currentStep() > 1 && this.currentStep() < 4) {
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
        } else if (step === 4) {
            if (this.verificationCode().trim().length < 6) {
                this.error.set('Please enter the 6-digit code from your email.');
                return false;
            }
        }
        return true;
    }

    async initiateSignUp() {
        this.loading.set(true);
        this.error.set(null);

        const errorMsg = await this.authService.signUp(this.formData.email, this.formData.password);

        if (errorMsg) {
            this.error.set(
                errorMsg.toLowerCase().includes('rate limit')
                    ? 'Too many attempts. Please wait a few minutes before trying again.'
                    : errorMsg
            );
            this.loading.set(false);
            return;
        }

        // If email confirmation is disabled in Supabase, the session is created
        // immediately and the user is already authenticated — skip OTP step.
        if (this.authService.isAuthenticated()) {
            await this.applyProfileAndNavigate();
            return;
        }

        this.currentStep.set(4);
        this.updateStepStatuses();
        this.startResendCooldown();
        this.loading.set(false);
    }

    async verifyAndComplete() {
        if (!this.validateStep(4)) return;

        this.loading.set(true);
        this.error.set(null);

        const success = await this.authService.verifySignupOtp(
            this.formData.email,
            this.verificationCode().trim()
        );

        if (!success) {
            this.error.set('Invalid or expired code. Please try again or request a new one.');
            this.loading.set(false);
            return;
        }

        // Wait for auth state to propagate
        setTimeout(() => this.applyProfileAndNavigate(), 500);
    }

    private async applyProfileAndNavigate() {
        if (this.authService.isAuthenticated()) {
            await this.userService.updateProfile({
                name: this.formData.fullName,
                role: this.formData.role,
                preferences: {
                    ...this.userService.user()!.preferences,
                    emailNotifications: this.formData.preferences.emailNotifications,
                    autoBackup: this.formData.preferences.autoBackup
                }
            });
            this.router.navigate(['/workspace']);
        }
        this.loading.set(false);
    }

    async resendCode() {
        if (this.resendCooldown() > 0) return;
        this.loading.set(true);
        const success = await this.authService.resendSignupOtp(this.formData.email);
        this.loading.set(false);
        if (success) {
            this.error.set(null);
            this.startResendCooldown();
        } else {
            this.error.set('Failed to resend code. Please try again.');
        }
    }

    private startResendCooldown() {
        this.resendCooldown.set(60);
        clearInterval(this.resendTimer);
        this.resendTimer = setInterval(() => {
            const n = this.resendCooldown() - 1;
            if (n <= 0) {
                this.resendCooldown.set(0);
                clearInterval(this.resendTimer);
            } else {
                this.resendCooldown.set(n);
            }
        }, 1000);
    }

    @HostListener('keydown.enter', ['$event'])
    handleEnter(event: Event) {
        event.preventDefault();
        this.nextStep();
    }
}
