import { __decorate } from 'tslib';
import { Injectable, signal, effect } from '@angular/core';
let ThemeService = class ThemeService {
  theme = signal('light'); // Default temporary, will init in constructor
  constructor() {
    // Initialize theme from storage or system preference
    const savedTheme = localStorage.getItem('theme');
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
  setTheme(newTheme) {
    this.theme.set(newTheme);
    localStorage.setItem('theme', newTheme);
  }
  toggleTheme() {
    this.theme.update((t) => {
      // Simple toggle between Light and Dark for quick access.
      // Other themes are accessible via Settings.
      const isDark = t === 'dark' || t === 'enterprise-dark';
      const newTheme = isDark ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }
};
ThemeService = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  ThemeService,
);
export { ThemeService };
