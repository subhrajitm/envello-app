import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AddNewModalComponent } from './add-new-modal.component';
import { StoreService, ArticleService, ResearchService, MeetingsService, NovelContentService } from '@envello/core';

describe('AddNewModalComponent', () => {
  let component: AddNewModalComponent;
  let fixture: ComponentFixture<AddNewModalComponent>;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('StoreService',
      ['addNote', 'addTask', 'addBookmark'],
      { notes: signal([]), tasks: signal([]) }
    );
    const articleSpy = jasmine.createSpyObj('ArticleService', ['addArticle'], { articles: signal([]) });
    const researchSpy = jasmine.createSpyObj('ResearchService', ['addLibrary'], { libraries: signal([]) });
    const meetingsSpy = jasmine.createSpyObj('MeetingsService', ['addMeeting'], { meetings: signal([]) });
    const novelSpy = jasmine.createSpyObj('NovelContentService', ['createNovel'], { novels: signal([]) });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [AddNewModalComponent, RouterTestingModule],
      providers: [
        { provide: StoreService,         useValue: storeSpy },
        { provide: ArticleService,       useValue: articleSpy },
        { provide: ResearchService,      useValue: researchSpy },
        { provide: MeetingsService,      useValue: meetingsSpy },
        { provide: NovelContentService,  useValue: novelSpy },
        { provide: Router,               useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddNewModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be closed by default', () => {
    expect(component.isOpen()).toBeFalse();
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
});
