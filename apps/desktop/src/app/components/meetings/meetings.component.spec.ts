import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MeetingsComponent } from './meetings.component';
import { MeetingsService, TauriService } from '@envello/core';

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
    };
    const tauriSpy = {
      saveFile: jest.fn(),
      openFileDialog: jest.fn(),
      setTitle: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MeetingsComponent],
      providers: [
        { provide: MeetingsService, useValue: meetingsSpy },
        { provide: TauriService,    useValue: tauriSpy },
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
