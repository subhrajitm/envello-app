import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'enterprise-dark' | 'light' | 'colorful' | 'enterprise-light' | 'typewriter';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<Theme>('dark'); // Default temporary, will init in constructor

  constructor() {
    // Initialize theme from storage or system preference
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      this.theme.set(savedTheme);
    } else {
      // Default to typewriter theme as requested
      this.theme.set('typewriter');
    }

    // Effect to update DOM and Storage when signal changes
    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('theme', currentTheme);
    });
  }

  toggleTheme() {
    this.theme.update(t => {
      if (t === 'dark') return 'enterprise-dark';
      if (t === 'enterprise-dark') return 'enterprise-light';
      if (t === 'enterprise-light') return 'light';
      if (t === 'light') return 'colorful';
      if (t === 'colorful') return 'typewriter';
      return 'dark';
    });
  }
}
