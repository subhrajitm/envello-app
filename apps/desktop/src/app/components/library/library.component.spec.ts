import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LibraryComponent } from './library.component';
import { ResearchService } from '@envello/core';

describe('LibraryComponent', () => {
  let component: LibraryComponent;
  let fixture: ComponentFixture<LibraryComponent>;

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
      imports: [LibraryComponent],
      providers: [
        { provide: ResearchService, useValue: researchSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
