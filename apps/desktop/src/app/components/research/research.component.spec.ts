import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ResearchComponent } from './research.component';
import { ResearchService } from '@envello/core';

describe('ResearchComponent', () => {
  let component: ResearchComponent;
  let fixture: ComponentFixture<ResearchComponent>;

  beforeEach(async () => {
    const researchSpy = {
      libraries: signal([]),
      sources: signal([]),
      summaries: signal([]),
      addLibrary: jest.fn(),
      updateLibrary: jest.fn(),
      deleteLibrary: jest.fn(),
      addSource: jest.fn(),
      updateSource: jest.fn(),
      deleteSource: jest.fn(),
      addSummary: jest.fn(),
      deleteSummary: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ResearchComponent],
      providers: [
        { provide: ResearchService, useValue: researchSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
