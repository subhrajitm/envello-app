import { Routes } from '@angular/router';
import { OverviewComponent } from './components/overview/overview.component';
import { NovelsComponent } from './components/novels/novels.component';
import { ResearchComponent } from './components/research/research.component';
import { ArticlesComponent } from './components/articles/articles.component';
import { JournalsComponent } from './components/journals/journals.component';
import { DailyNotesComponent } from './components/daily-notes/daily-notes.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { MeetingsComponent } from './components/meetings/meetings.component';
import { BooksComponent } from './components/books/books.component';
import { CodeSnippetsComponent } from './components/code-snippets/code-snippets.component';
import { BrainstormingComponent } from './components/brainstorming/brainstorming.component';
import { NovelEditorComponent } from './components/novels/novel-editor/novel-editor.component';
import { ActivityLogComponent } from './components/activity-log/activity-log.component';

export const routes: Routes = [
    { path: '', redirectTo: 'overview', pathMatch: 'full' },
    { path: 'overview', component: OverviewComponent, data: { hasSidebar: true } },
    { path: 'novels', component: NovelsComponent, data: { hasSidebar: true } },
    { path: 'novels/:id', component: NovelEditorComponent, data: { immersive: true } },
    { path: 'research', component: ResearchComponent, data: { hasSidebar: true } },
    { path: 'articles', component: ArticlesComponent, data: { hasSidebar: true } },
    { path: 'journals', component: JournalsComponent, data: { hasSidebar: true } },
    { path: 'daily-notes', component: DailyNotesComponent, data: { hasSidebar: true } },
    { path: 'tasks', component: TasksComponent, data: { hasSidebar: true } },
    { path: 'meetings', component: MeetingsComponent, data: { hasSidebar: true } },
    { path: 'books', component: BooksComponent, data: { hasSidebar: true } },
    { path: 'snippets', component: CodeSnippetsComponent, data: { hasSidebar: true } },
    { path: 'activity-log', component: ActivityLogComponent, data: { hasSidebar: true } },
    { path: 'brainstorming', component: BrainstormingComponent, data: { hasSidebar: true, immersive: true } },
    // Wildcard
    { path: '**', redirectTo: 'overview' }
];
