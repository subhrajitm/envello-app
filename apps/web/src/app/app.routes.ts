import { Routes } from '@angular/router';
import { authGuard } from '@envello/core';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('@envello/ui').then(m => m.LoginComponent),
    data: { hasSidebar: false, fullScreen: true }
  },
  {
    path: 'sign-up',
    loadComponent: () => import('@envello/ui').then(m => m.SignUpComponent),
    data: { hasSidebar: false, fullScreen: true }
  },
  {
    path: 'workspace',
    loadComponent: () => import('@envello/feature-workspace').then(m => m.WorkspaceComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },

  {
    path: 'write',
    loadComponent: () => import('@envello/feature-novels').then(m => m.NovelsComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'write/:id',
    loadComponent: () => import('@envello/feature-novels').then(m => m.ComposerComponent),
    canActivate: [authGuard],
    data: { immersive: true },
  },
  { path: 'novels', redirectTo: 'write', pathMatch: 'full' },
  { path: 'articles', redirectTo: 'write', pathMatch: 'full' },
  {
    path: 'research',
    loadComponent: () => import('./components/research/research.component').then(m => m.ResearchComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },

  {
    path: 'daily-notes',
    loadComponent: () => import('@envello/feature-daily-notes').then(m => m.DailyNotesComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'tasks',
    loadComponent: () => import('@envello/feature-tasks').then(m => m.TasksComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'meetings',
    loadComponent: () => import('./components/meetings/meetings.component').then(m => m.MeetingsComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'books',
    loadComponent: () => import('@envello/feature-books').then(m => m.BooksComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },

  {
    path: 'activity-log',
    loadComponent: () => import('./components/activity-log/activity-log.component').then(m => m.ActivityLogComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'bin',
    loadComponent: () => import('./components/bin/bin.component').then(m => m.BinComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'developer-settings',
    loadComponent: () => import('./components/developer-settings/developer-settings.component').then(m => m.DeveloperSettingsComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'bookmarks',
    loadComponent: () => import('@envello/feature-bookmarks').then(m => m.BookmarksComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'vault',
    loadComponent: () => import('@envello/feature-vault').then(m => m.VaultComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'subscriptions',
    loadComponent: () => import('@envello/feature-vendor').then(m => m.VendorComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'projects',
    loadComponent: () => import('@envello/ui').then(m => m.ProfileManagerComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'not-found',
    loadComponent: () => import('./components/errors/not-found/not-found.component').then(m => m.NotFoundComponent),
    data: { hasSidebar: false },
  },
  {
    path: 'server-error',
    loadComponent: () => import('./components/errors/server-error/server-error.component').then(m => m.ServerErrorComponent),
    data: { hasSidebar: false },
  },
  { path: '**', redirectTo: 'not-found' },
];
