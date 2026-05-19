import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  icon: string;
  label: string;
  path: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  readonly navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'auto_awesome', label: 'AI Settings', path: '/ai-settings' },
    { icon: 'group', label: 'Users', path: '/users' },
    { icon: 'bar_chart', label: 'Usage', path: '/usage' },
    { icon: 'toggle_on', label: 'Feature Flags', path: '/feature-flags' },
  ];

  readonly userEmail = signal<string>('admin@envello.app');

  logout() {
    localStorage.removeItem('admin-override');
    window.location.href = '/login';
  }
}
