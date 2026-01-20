import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../../services/theme.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  @Input() activeTab = 'Overview';

  themeService = inject(ThemeService);
  private router = inject(Router);

  tabs = [
    'Overview',
    'Daily Notes',
    'Novels/Fiction',
    'Journals',
    'Research',
    'Articles/Blogs',
    'Meetings',
    'Tasks/Todos',
    'Books/Reading',
    'Code Snippets',
    'Brainstorming',
  ];

  get theme(): Theme {
    return this.themeService.theme();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  navigateTo(tab: string) {
    // Map tab name back to route path
    const map: Record<string, string> = {
      'Overview': 'overview',
      'Novels/Fiction': 'novels',
      'Research': 'research',
      'Articles/Blogs': 'articles',
      'Journals': 'journals',
      'Daily Notes': 'daily-notes',
      'Tasks/Todos': 'tasks',
      'Meetings': 'meetings',
      'Books/Reading': 'books',
      'Code Snippets': 'snippets',
      'Brainstorming': 'brainstorming'
    };
    const path = map[tab] || 'overview';
    this.router.navigate([path]);
  }
}
