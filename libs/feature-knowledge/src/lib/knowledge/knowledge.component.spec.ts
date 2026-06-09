import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { KnowledgeComponent } from './knowledge.component';
import { ResearchService, FileStorageService, AiService, StoreService } from '@envello/core';

describe('KnowledgeComponent', () => {
  let component: KnowledgeComponent;
  let fixture: ComponentFixture<KnowledgeComponent>;

  beforeEach(async () => {
    const researchSpy = {
      collections: signal([]),
      sources: signal([]),
      summaries: signal([]),
      addCollection: jest.fn().mockReturnValue({ id: 'c1', name: 'Test' }),
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
    const fileStorageSpy = {
      files: signal([]),
      uploadMany: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn().mockResolvedValue(''),
      formatSize: jest.fn().mockReturnValue('0 B'),
    };
    const aiSpy = {
      sendMessage: jest.fn().mockResolvedValue(''),
    };
    const storeSpy = {
      tasks: signal([]),
    };

    await TestBed.configureTestingModule({
      imports: [KnowledgeComponent],
      providers: [
        { provide: ResearchService,   useValue: researchSpy },
        { provide: FileStorageService, useValue: fileStorageSpy },
        { provide: AiService,          useValue: aiSpy },
        { provide: StoreService,       useValue: storeSpy },
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
