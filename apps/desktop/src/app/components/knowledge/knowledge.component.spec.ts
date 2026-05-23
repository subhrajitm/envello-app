import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { KnowledgeComponent } from './knowledge.component';
import { ResearchService } from '@envello/core';

describe('KnowledgeComponent', () => {
  let component: KnowledgeComponent;
  let fixture: ComponentFixture<KnowledgeComponent>;

  beforeEach(async () => {
    const researchSpy = {
      collections: signal([]),
      sources: signal([]),
      summaries: signal([]),
      addCollection: jest.fn(),
      updateCollection: jest.fn(),
      deleteCollection: jest.fn(),
      getSourcesByCollection: jest.fn().mockReturnValue([]),
      getSummariesByCollection: jest.fn().mockReturnValue([]),
      addSource: jest.fn(),
      updateSource: jest.fn(),
      deleteSource: jest.fn(),
      addSummary: jest.fn(),
      deleteSummary: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [KnowledgeComponent],
      providers: [
        { provide: ResearchService, useValue: researchSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
