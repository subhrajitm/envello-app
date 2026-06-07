import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MeetingsComponent } from './meetings.component';
import { MeetingsService, CalendarSyncService, AiService } from '@envello/core';

describe('MeetingsComponent', () => {
  let component: MeetingsComponent;
  let fixture: ComponentFixture<MeetingsComponent>;

  beforeEach(async () => {
    const meetingsSpy = {
      meetings: signal([]),
      selectedMeetingId: signal(null),
      viewFilter: signal('all'),
      viewMode: signal('list'),
      sortBy: signal('date'),
      sortDirection: signal('asc'),
      searchQuery: signal(''),
      selectedProject: signal(''),
      selectedLabels: signal([]),
      calendarDate: signal(new Date()),
      addMeeting: jest.fn(),
      updateMeeting: jest.fn(),
      deleteMeeting: jest.fn(),
      cancelMeeting: jest.fn(),
      completeMeeting: jest.fn(),
      duplicateMeeting: jest.fn(),
      createRecurringSeries: jest.fn(),
      addAttendee: jest.fn(),
      removeAttendee: jest.fn(),
      addAgendaItem: jest.fn(),
      updateAgendaItem: jest.fn(),
      deleteAgendaItem: jest.fn(),
      addActionItem: jest.fn(),
      updateActionItem: jest.fn(),
      deleteActionItem: jest.fn(),
      convertActionItemToTask: jest.fn(),
      addNote: jest.fn(),
      deleteNote: jest.fn(),
    };
    const syncSpy = {
      connections: signal([]),
      addConnection: jest.fn(),
      syncConnection: jest.fn(),
      syncAll: jest.fn(),
    };
    const aiSpy = {
      sendMessage: jest.fn().mockResolvedValue(''),
    };

    await TestBed.configureTestingModule({
      imports: [MeetingsComponent],
      providers: [
        { provide: MeetingsService,     useValue: meetingsSpy },
        { provide: CalendarSyncService, useValue: syncSpy },
        { provide: AiService,           useValue: aiSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MeetingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
