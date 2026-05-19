import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SupabaseService } from '@envello/core';

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
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private sb = inject(SupabaseService);
  private router = inject(Router);

  readonly navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'auto_awesome', label: 'AI Settings', path: '/ai-settings' },
    { icon: 'group', label: 'Users', path: '/users' },
    { icon: 'bar_chart', label: 'Usage', path: '/usage' },
    { icon: 'toggle_on', label: 'Feature Flags', path: '/feature-flags' },
    { icon: 'history', label: 'Audit Log', path: '/audit-log' },
  ];

  readonly userEmail = signal<string>('');
  private authSub?: { data: { subscription: { unsubscribe(): void } } };

  async ngOnInit() {
    const { data: { user } } = await this.sb.client.auth.getUser();
    this.userEmail.set(user?.email ?? '');

    this.authSub = this.sb.client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') this.router.navigate(['/login']);
    });
  }

  ngOnDestroy() {
    this.authSub?.data.subscription.unsubscribe();
  }

  async logout() {
    await this.sb.client.auth.signOut();
    this.router.navigate(['/login']);
  }
}
