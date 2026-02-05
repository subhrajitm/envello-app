import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent),
    data: { hasSidebar: false, fullScreen: true }
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./components/auth/sign-up/sign-up.component').then(m => m.SignUpComponent),
    data: { hasSidebar: false, fullScreen: true }
  },
  {
    path: 'workspace',
    loadComponent: () => import('./components/workspace/workspace.component').then(m => m.WorkspaceComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('./components/projects/project-details/project-details.component').then(m => m.ProjectDetailsComponent),
    data: { hasSidebar: true }
  },
  {
    path: 'novels',
    loadComponent: () => import('./components/novels/novels.component').then(m => m.NovelsComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'novels/:id',
    loadComponent: () => import('./components/novels/novel-editor/novel-editor.component').then(m => m.NovelEditorComponent),
    data: { immersive: true },
  },
  {
    path: 'research',
    loadComponent: () => import('./components/research/research.component').then(m => m.ResearchComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'articles',
    loadComponent: () => import('./components/articles/articles.component').then(m => m.ArticlesComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'journals',
    loadComponent: () => import('./components/journals/journals.component').then(m => m.JournalsComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'daily-notes',
    loadComponent: () => import('./components/daily-notes/daily-notes.component').then(m => m.DailyNotesComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'tasks',
    loadComponent: () => import('./components/tasks/tasks.component').then(m => m.TasksComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'meetings',
    loadComponent: () => import('./components/meetings/meetings.component').then(m => m.MeetingsComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'books',
    loadComponent: () => import('./components/books/books.component').then(m => m.BooksComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'snippets',
    loadComponent: () => import('./components/code-snippets/code-snippets.component').then(m => m.CodeSnippetsComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'activity-log',
    loadComponent: () => import('./components/activity-log/activity-log.component').then(m => m.ActivityLogComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'bin',
    loadComponent: () => import('./components/bin/bin.component').then(m => m.BinComponent),
    data: { hasSidebar: true },
  },
  {
    path: 'developer-settings',
    loadComponent: () => import('./components/developer-settings/developer-settings.component').then(m => m.DeveloperSettingsComponent),
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
