import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'enterprise-dark' | 'light' | 'colorful' | 'enterprise-light' | 'typewriter';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<Theme>('light'); // Default temporary, will init in constructor

  constructor() {
    // Initialize theme from storage or system preference
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      this.theme.set(savedTheme);
    } else {
      // Default to light theme as requested
      this.theme.set('light');
    }

    // Effect to update DOM when signal changes
    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.setAttribute('data-theme', currentTheme);
    });
  }

  toggleTheme() {
    this.theme.update(t => {
      let newTheme: Theme = 'dark';
      if (t === 'dark') newTheme = 'enterprise-dark';
      else if (t === 'enterprise-dark') newTheme = 'enterprise-light';
      else if (t === 'enterprise-light') newTheme = 'light';
      else if (t === 'light') newTheme = 'colorful';
      else if (t === 'colorful') newTheme = 'typewriter';
      else newTheme = 'dark';

      // Save user preference
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }
}
