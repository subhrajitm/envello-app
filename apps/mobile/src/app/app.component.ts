import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  tab: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  isFullScreen = signal(false);

  readonly navItems: NavItem[] = [
    { path: '/workspace', label: 'Home',     icon: 'space_dashboard', tab: 'workspace' },
    { path: '/tasks',     label: 'Tasks',    icon: 'task_alt',        tab: 'tasks'     },
    { path: '/daily-notes', label: 'Notes',  icon: 'edit_note',       tab: 'notes'     },
    { path: '/settings',  label: 'Settings', icon: 'settings',        tab: 'settings'  },
  ];

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
      this.isFullScreen.set(!!data['fullScreen']);
    });
  }
}
