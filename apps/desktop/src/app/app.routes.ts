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
    path: 'projects',
    loadComponent: () => import('@envello/feature-projects').then(m => m.ProjectsComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true }
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('@envello/feature-projects').then(m => m.ProjectDetailsComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true }
  },
  {
    path: 'novels',
    loadComponent: () => import('@envello/feature-novels').then(m => m.NovelsComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'novels/:id',
    loadComponent: () => import('@envello/feature-novels').then(m => m.NovelEditorComponent),
    canActivate: [authGuard],
    data: { immersive: true },
  },
  {
    path: 'research',
    loadComponent: () => import('./components/research/research.component').then(m => m.ResearchComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'articles',
    loadComponent: () => import('./components/articles/articles.component').then(m => m.ArticlesComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'journals',
    loadComponent: () => import('./components/journals/journals.component').then(m => m.JournalsComponent),
    canActivate: [authGuard],
    data: { hasSidebar: true },
  },
  {
    path: 'daily-notes',
    loadComponent: () => import('./components/daily-notes/daily-notes.component').then(m => m.DailyNotesComponent),
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
