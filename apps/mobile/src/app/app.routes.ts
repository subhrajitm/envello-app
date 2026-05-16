import { Routes } from '@angular/router';
import { authGuard } from '@envello/core';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('@envello/ui').then(m => m.LoginComponent),
    data: { fullScreen: true }
  },
  {
    path: 'sign-up',
    loadComponent: () => import('@envello/ui').then(m => m.SignUpComponent),
    data: { fullScreen: true }
  },

  // Bottom nav primary routes
  {
    path: 'workspace',
    loadComponent: () => import('@envello/feature-workspace').then(m => m.WorkspaceComponent),
    canActivate: [authGuard],
    data: { tab: 'workspace' }
  },
  {
    path: 'tasks',
    loadComponent: () => import('@envello/feature-tasks').then(m => m.TasksComponent),
    canActivate: [authGuard],
    data: { tab: 'tasks' }
  },
  {
    path: 'daily-notes',
    loadComponent: () => import('@envello/feature-daily-notes').then(m => m.DailyNotesComponent),
    canActivate: [authGuard],
    data: { tab: 'notes' }
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard],
    data: { tab: 'settings' }
  },

  // Secondary routes (accessible within features)
  {
    path: 'write',
    loadComponent: () => import('@envello/feature-novels').then(m => m.WriteComponent),
    canActivate: [authGuard],
    data: {}
  },
  {
    path: 'write/:id',
    loadComponent: () => import('@envello/feature-novels').then(m => m.ComposerComponent),
    canActivate: [authGuard],
    data: { fullScreen: true }
  },
  {
    path: 'bookmarks',
    loadComponent: () => import('@envello/feature-bookmarks').then(m => m.BookmarksComponent),
    canActivate: [authGuard],
    data: {}
  },
  {
    path: 'vault',
    loadComponent: () => import('@envello/feature-vault').then(m => m.VaultComponent),
    canActivate: [authGuard],
    data: {}
  },
  {
    path: 'subscriptions',
    loadComponent: () => import('@envello/feature-vendor').then(m => m.VendorComponent),
    canActivate: [authGuard],
    data: {}
  },

  // Redirects
  { path: 'novels', redirectTo: 'write', pathMatch: 'full' },
  { path: '**', redirectTo: 'workspace' },
];
