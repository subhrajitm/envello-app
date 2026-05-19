import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have the envello title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('envello');
  });

  it('should map URL to tab name correctly', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.mapUrlToTabName('workspace')).toBe('Workspace');
    expect(app.mapUrlToTabName('tasks')).toBe('Tasks');
    expect(app.mapUrlToTabName('unknown')).toBe('Workspace');
  });

  it('should update sidebar collapsed state', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.sidebarCollapsed()).toBe(true);
    app.onSidebarCollapsedChange(false);
    expect(app.sidebarCollapsed()).toBe(false);
  });
});
