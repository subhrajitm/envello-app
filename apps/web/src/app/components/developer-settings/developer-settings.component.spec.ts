import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DeveloperSettingsComponent } from './developer-settings.component';
import { StoreService, BinService, SessionService, UserService, MeetingsService, ArticleService, ResearchService, SqliteDataService } from '@envello/core';

describe('DeveloperSettingsComponent', () => {
  let component: DeveloperSettingsComponent;
  let fixture: ComponentFixture<DeveloperSettingsComponent>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    const storeSpy = jasmine.createSpyObj('StoreService', [], {
      tasks: signal([]),
      notes: signal([]),
      planningItems: signal([]),
      activities: signal([]),
      novels: signal([]),
      spaces: signal([]),
    });
    const binSpy = jasmine.createSpyObj('BinService', [], { items: signal([]) });
    const sessionSpy = jasmine.createSpyObj('SessionService', ['formatTime'], {
      pageStats: signal([]),
    });
    sessionSpy.formatTime.and.returnValue('0s');

    const userSpy = jasmine.createSpyObj('UserService', [], { user: signal(null) });
    const meetingsSpy = jasmine.createSpyObj('MeetingsService', [], { meetings: signal([]) });
    const articleSpy = jasmine.createSpyObj('ArticleService', [], { articles: signal([]) });
    const researchSpy = jasmine.createSpyObj('ResearchService', [], {
      libraries: signal([]),
      sources: signal([]),
      summaries: signal([]),
    });
    const dbSpy = jasmine.createSpyObj('SqliteDataService', ['exportData', 'importData']);

    await TestBed.configureTestingModule({
      imports: [DeveloperSettingsComponent, RouterTestingModule],
      providers: [
        { provide: Router,            useValue: routerSpy },
        { provide: StoreService,      useValue: storeSpy },
        { provide: BinService,        useValue: binSpy },
        { provide: SessionService,    useValue: sessionSpy },
        { provide: UserService,       useValue: userSpy },
        { provide: MeetingsService,   useValue: meetingsSpy },
        { provide: ArticleService,    useValue: articleSpy },
        { provide: ResearchService,   useValue: researchSpy },
        { provide: SqliteDataService, useValue: dbSpy },
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

  it('clearSearch should reset searchQuery', () => {
    component.searchQuery.set('abc');
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
  });

  it('formatColumnName should convert camelCase to spaced title', () => {
    expect(component.formatColumnName('wordCount')).toBe('Word Count');
    expect(component.formatColumnName('id')).toBe('Id');
  });

  it('tabs should be populated with expected tab ids', () => {
    const ids = component.tabs().map(t => t.id);
    expect(ids).toContain('tasks');
    expect(ids).toContain('notes');
    expect(ids).toContain('session');
    expect(ids).toContain('user');
  });
});
