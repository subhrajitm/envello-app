import { Route } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { adminGuard } from './guards/admin.guard';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'ai-settings',
        loadComponent: () =>
          import('./pages/ai-settings/ai-settings.component').then(m => m.AiSettingsComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'usage',
        loadComponent: () =>
          import('./pages/usage/usage.component').then(m => m.UsageComponent),
      },
      {
        path: 'feature-flags',
        loadComponent: () =>
          import('./pages/feature-flags/feature-flags.component').then(m => m.FeatureFlagsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
