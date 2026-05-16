import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { QuickFindComponent } from './quick-find.component';
import { StoreService, MeetingsService } from '@envello/core';

describe('QuickFindComponent', () => {
  let component: QuickFindComponent;
  let fixture: ComponentFixture<QuickFindComponent>;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('StoreService', [], {
      notes: signal([]),
      tasks: signal([]),
      novels: signal([]),
      bookmarks: signal([]),
      spaces: signal([]),
    });
    const meetingsSpy = jasmine.createSpyObj('MeetingsService', [], { meetings: signal([]) });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [QuickFindComponent, RouterTestingModule],
      providers: [
        { provide: StoreService,    useValue: storeSpy },
        { provide: MeetingsService, useValue: meetingsSpy },
        { provide: Router,          useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickFindComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be closed by default', () => {
    expect(component.isOpen()).toBeFalse();
  });

  it('should have empty searchQuery by default', () => {
    expect(component.searchQuery()).toBe('');
  });

  it('open should set isOpen to true', () => {
    component.open();
    expect(component.isOpen()).toBeTrue();
  });

  it('close should set isOpen to false', () => {
    component.open();
    component.close();
    expect(component.isOpen()).toBeFalse();
  });

  it('isCommandMode should be true when query starts with >', () => {
    component.searchQuery.set('>go');
    expect(component.isCommandMode()).toBeTrue();
  });
});
