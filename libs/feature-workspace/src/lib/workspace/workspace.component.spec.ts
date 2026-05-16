import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { WorkspaceComponent } from './workspace.component';
import {
  StoreService, UserService, NotificationService,
  AiService, MeetingsService, ResearchService,
} from '@envello/core';

describe('WorkspaceComponent', () => {
  let component: WorkspaceComponent;
  let fixture: ComponentFixture<WorkspaceComponent>;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('StoreService',
      ['addTask', 'addNote', 'addBookmark', 'addNovel', 'addSpace', 'addActivity'],
      {
        tasks:      signal([]),
        notes:      signal([]),
        novels:     signal([]),
        activities: signal([]),
        spaces:     signal([]),
        bookmarks:  signal([]),
      }
    );
    storeSpy.addNote.and.returnValue(Promise.resolve());

    const userSpy = jasmine.createSpyObj('UserService', ['userName'], { userName: signal('Test') });
    userSpy.userName.and.returnValue('Test');

    const notifSpy   = jasmine.createSpyObj('NotificationService', ['show']);
    const aiSpy      = jasmine.createSpyObj('AiService', ['sendMessage']);
    aiSpy.sendMessage.and.returnValue(Promise.resolve('{"type":"task","title":"Test task","priority":"MEDIUM","due":null,"time":null,"url":null,"description":null,"writingType":null,"route":null}'));

    const meetingsSpy  = jasmine.createSpyObj('MeetingsService', ['addMeeting'], { meetings: signal([]) });
    const researchSpy  = jasmine.createSpyObj('ResearchService', ['addLibrary'], { libraries: signal([]) });

    await TestBed.configureTestingModule({
      imports: [WorkspaceComponent, RouterTestingModule],
      providers: [
        { provide: StoreService,       useValue: storeSpy      },
        { provide: UserService,        useValue: userSpy       },
        { provide: NotificationService,useValue: notifSpy      },
        { provide: AiService,          useValue: aiSpy         },
        { provide: MeetingsService,    useValue: meetingsSpy   },
        { provide: ResearchService,    useValue: researchSpy   },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(WorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty inputText', () => {
    expect(component.inputText()).toBe('');
  });

  it('clearCommand resets inputText and lastCreated', () => {
    component.inputText.set('hello');
    component.lastCreated.set({ type: 'Task', title: 'x', route: '/tasks' });
    component.clearCommand();
    expect(component.inputText()).toBe('');
    expect(component.lastCreated()).toBeNull();
  });

  it('setExampleText populates inputText', () => {
    component.setExampleText('Add task: test');
    expect(component.inputText()).toBe('Add task: test');
  });

  it('executeCommand does nothing when inputText is empty', async () => {
    component.inputText.set('');
    await component.executeCommand();
    expect(component.isProcessing()).toBeFalse();
  });

  it('getGreeting returns a greeting string', () => {
    const greeting = component.getGreeting();
    expect(greeting).toMatch(/Good (Morning|Afternoon|Evening)/);
  });

  it('has 6 example chips', () => {
    expect(component.examples.length).toBe(6);
  });
});
