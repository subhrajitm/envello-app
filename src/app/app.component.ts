import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from './components/layout/header/header.component';
import { FooterComponent } from './components/layout/footer/footer.component';
import { filter, map, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'envello-app';
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  currentTab = signal('Overview');
  hasSidebar = signal(true);
  isImmersive = signal(false);

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      mergeMap(route => route.data)
    ).subscribe(data => {
      this.hasSidebar.set(data['hasSidebar'] !== false); // default to true if not specified? React logic was whitelist.
      this.isImmersive.set(!!data['immersive']);

      // Map path to Tab Name for Header
      const url = this.router.url.split('/')[1];
      this.currentTab.set(this.mapUrlToTabName(url));
    });
  }

  mapUrlToTabName(url: string): string {
    const map: Record<string, string> = {
      'overview': 'Overview',
      'novels': 'Novels/Fiction',
      'research': 'Research',
      'articles': 'Articles/Blogs',
      'journals': 'Journals',
      'daily-notes': 'Daily Notes',
      'tasks': 'Tasks/Todos',
      'meetings': 'Meetings',
      'books': 'Books/Reading',
      'snippets': 'Code Snippets',
      'brainstorming': 'Brainstorming',
      'bin': 'Bin'
    };
    return map[url] || 'Overview';
  }
}
