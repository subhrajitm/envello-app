import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

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
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.theme.set(systemDark ? 'dark' : 'light');
    }

    // Effect to update DOM and Storage when signal changes
    effect(() => {
      const currentTheme = this.theme();
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('theme', currentTheme);
    });
  }

  toggleTheme() {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }
}
