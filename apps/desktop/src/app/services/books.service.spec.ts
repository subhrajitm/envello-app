import { TestBed } from '@angular/core/testing';
import { BooksService } from './books.service';

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BooksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have books signal', () => {
    expect(service.books().length).toBeGreaterThan(0);
  });

  it('should have filteredBooks computed', () => {
    expect(service.filteredBooks().length).toBeGreaterThanOrEqual(0);
  });

  it('should add book', () => {
    const before = service.books().length;
    service.addBook({
      title: 'Test Book',
      author: 'Test Author',
      category: 'OTHER',
      status: 'queued',
      progress: 0,
      notesCount: 0,
      lastAccessed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(service.books().length).toBe(before + 1);
  });
});
