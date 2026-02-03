import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white">
      <div class="bg-gray-800 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-700">
        <h2 class="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Welcome to Envello
        </h2>
        
        <form (ngSubmit)="handleLogin()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-400">Email</label>
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-blue-500 focus:outline-none transition-colors text-white"
              placeholder="you@example.com"
              required
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-400">Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-blue-500 focus:outline-none transition-colors text-white"
              placeholder="••••••••"
              required
            >
          </div>

          <div *ngIf="error()" class="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm">
            {{ error() }}
          </div>

          <button 
            type="submit" 
            [disabled]="loading()"
            class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 pointer-events-auto cursor-pointer"
          >
            <span *ngIf="loading()">Logging in...</span>
            <span *ngIf="!loading()">Log In</span>
          </button>

          <div class="text-center text-sm text-gray-500 mt-4">
            Don't have an account? 
            <button type="button" (click)="handleSignUp()" class="text-blue-400 hover:text-blue-300 ml-1 cursor-pointer">
                Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  `
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
