import { TestBed } from '@angular/core/testing';
import { MeetingsService, Meeting } from './meetings.service';
import { BinService } from './bin.service';
import { StoreService } from './store.service';
import { DataService } from '@envello/data';

const mockMeeting = (): Meeting => ({
  id: 'meeting-1',
  title: 'Test Meeting',
  date: '2026-06-07',
  startTime: '10:00',
  endTime: '11:00',
  meetingType: 'video',
  status: 'scheduled',
  priority: 'MEDIUM',
  attendees: [],
  agendaItems: [],
  actionItems: [],
  notes: [],
  labels: [],
  reminders: [],
  createdAt: new Date().toISOString(),
});

describe('MeetingsService', () => {
  let service: MeetingsService;
  let binSpy: jasmine.SpyObj<BinService>;
  let storeSpy: jasmine.SpyObj<StoreService>;
  let dataSpy: jasmine.SpyObj<DataService>;

  beforeEach(() => {
    binSpy   = jasmine.createSpyObj('BinService',   ['addToBin']);
    storeSpy = jasmine.createSpyObj('StoreService', ['addActivity'], { tasks: jasmine.createSpy().and.returnValue([]) });
    dataSpy  = jasmine.createSpyObj('DataService',  ['getAll', 'upsert', 'remove']);
    dataSpy.getAll.and.returnValue(Promise.resolve([]));

    TestBed.configureTestingModule({
      providers: [
        MeetingsService,
        { provide: BinService,   useValue: binSpy   },
        { provide: StoreService, useValue: storeSpy },
        { provide: DataService,  useValue: dataSpy  },
      ],
    });
    service = TestBed.inject(MeetingsService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty meetings signal', () => {
    expect(service.meetings()).toEqual([]);
  });

  it('addMeeting should add a meeting and persist it', () => {
    const input = { title: 'Standup', date: '2026-06-08', startTime: '09:00', meetingType: 'video' as const };
    service.addMeeting(input);
    expect(service.meetings().length).toBe(1);
    expect(service.meetings()[0].title).toBe('Standup');
    expect(dataSpy.upsert).toHaveBeenCalled();
  });

  it('deleteMeeting should move meeting to bin and remove from signal', () => {
    service.addMeeting({ title: 'Demo', date: '2026-06-09', startTime: '14:00', meetingType: 'video' as const });
    const id = service.meetings()[0].id;
    service.deleteMeeting(id);
    expect(service.meetings().length).toBe(0);
    expect(binSpy.addToBin).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'meeting', originalId: id }));
    expect(dataSpy.remove).toHaveBeenCalledWith('meetings', id);
  });

  it('cancelMeeting should set status to cancelled', () => {
    service.addMeeting({ title: 'Review', date: '2026-06-10', startTime: '15:00', meetingType: 'in-person' as const });
    const id = service.meetings()[0].id;
    service.cancelMeeting(id);
    expect(service.meetings()[0].status).toBe('cancelled');
    expect(dataSpy.upsert).toHaveBeenCalled();
  });

  it('completeMeeting should set status to completed', () => {
    service.addMeeting({ title: 'Retro', date: '2026-06-11', startTime: '16:00', meetingType: 'video' as const });
    const id = service.meetings()[0].id;
    service.completeMeeting(id);
    expect(service.meetings()[0].status).toBe('completed');
  });

  it('addAgendaItem should append item to meeting', () => {
    service.addMeeting({ title: 'Planning', date: '2026-06-12', startTime: '10:00', meetingType: 'video' as const });
    const id = service.meetings()[0].id;
    service.addAgendaItem(id, { title: 'Q3 Goals' });
    expect(service.meetings()[0].agendaItems?.length).toBe(1);
    expect(service.meetings()[0].agendaItems?.[0].title).toBe('Q3 Goals');
  });

  it('deleteAgendaItem should remove item from meeting', () => {
    service.addMeeting({ title: 'Planning', date: '2026-06-12', startTime: '10:00', meetingType: 'video' as const });
    const meetingId = service.meetings()[0].id;
    service.addAgendaItem(meetingId, { title: 'Item A' });
    const itemId = service.meetings()[0].agendaItems![0].id;
    service.deleteAgendaItem(meetingId, itemId);
    expect(service.meetings()[0].agendaItems?.length).toBe(0);
  });

  it('addActionItem should append action item to meeting', () => {
    service.addMeeting({ title: 'Sprint', date: '2026-06-13', startTime: '11:00', meetingType: 'video' as const });
    const id = service.meetings()[0].id;
    service.addActionItem(id, { title: 'Fix bug', status: 'open' });
    expect(service.meetings()[0].actionItems?.length).toBe(1);
  });

  it('duplicateMeeting should create a new meeting with same details', () => {
    service.addMeeting({ title: 'Original', date: '2026-06-14', startTime: '12:00', meetingType: 'video' as const });
    const original = service.meetings()[0];
    const duplicate = service.duplicateMeeting(original.id);
    expect(service.meetings().length).toBe(2);
    expect(duplicate?.title).toContain('Original');
    expect(duplicate?.id).not.toBe(original.id);
  });
});
