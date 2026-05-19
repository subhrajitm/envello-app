import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DeveloperSettingsComponent } from './developer-settings.component';
import { StoreService, BinService, SessionService, UserService, MeetingsService, ArticleService, ResearchService, SqliteService, TauriService } from '@envello/core';

describe('DeveloperSettingsComponent', () => {
  let component: DeveloperSettingsComponent;
  let fixture: ComponentFixture<DeveloperSettingsComponent>;
  let routerSpy: { navigate: jest.Mock };

  beforeEach(async () => {
    routerSpy = { navigate: jest.fn() };

    const storeSpy = {
      tasks: signal([]),
      notes: signal([]),
      planningItems: signal([]),
      activities: signal([]),
      novels: signal([]),
      spaces: signal([]),
    };
    const binSpy = { items: signal([]) };
    const sessionSpy = {
      formatTime: jest.fn().mockReturnValue('0s'),
      pageStats: signal([]),
    };
    const userSpy = { user: signal(null) };
    const meetingsSpy = { meetings: signal([]) };
    const articleSpy = { articles: signal([]) };
    const researchSpy = {
      libraries: signal([]),
      sources: signal([]),
      summaries: signal([]),
    };
    const sqliteSpy = { exportDb: jest.fn(), runMigrations: jest.fn() };
    const tauriSpy = { saveFile: jest.fn(), openFileDialog: jest.fn(), setTitle: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [DeveloperSettingsComponent, RouterTestingModule],
      providers: [
        { provide: Router,          useValue: routerSpy },
        { provide: StoreService,    useValue: storeSpy },
        { provide: BinService,      useValue: binSpy },
        { provide: SessionService,  useValue: sessionSpy },
        { provide: UserService,     useValue: userSpy },
        { provide: MeetingsService, useValue: meetingsSpy },
        { provide: ArticleService,  useValue: articleSpy },
        { provide: ResearchService, useValue: researchSpy },
        { provide: SqliteService,   useValue: sqliteSpy },
        { provide: TauriService,    useValue: tauriSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeveloperSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default activeTab to tasks', () => {
    expect(component.activeTab()).toBe('tasks');
  });

  it('should default searchQuery to empty string', () => {
    expect(component.searchQuery()).toBe('');
  });

  it('setActiveTab should update activeTab and clear searchQuery', () => {
    component.searchQuery.set('some search');
    component.setActiveTab('notes');
    expect(component.activeTab()).toBe('notes');
    expect(component.searchQuery()).toBe('');
  });

  it('goBack should navigate to /workspace', () => {
    component.goBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/workspace']);
  });

  it('tabs should include expected tab ids', () => {
    const ids = component.tabs().map(t => t.id);
    expect(ids).toContain('tasks');
    expect(ids).toContain('notes');
    expect(ids).toContain('session');
    expect(ids).toContain('user');
  });
});
