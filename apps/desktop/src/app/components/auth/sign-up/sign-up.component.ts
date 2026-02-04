import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../services/user.service';

@Component({
    selector: 'app-sign-up',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './sign-up.component.html',
    styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent {
    authService = inject(AuthService);
    private userService = inject(UserService);
    private router = inject(Router);

    constructor() {
        effect(() => {
            if (this.authService.isAuthenticated()) {
                this.router.navigate(['/overview']);
            }
        });
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
                    this.router.navigate(['/overview']);
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
