import { TestBed } from '@angular/core/testing';
import { SnippetsService } from './snippets.service';

describe('SnippetsService', () => {
  let service: SnippetsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SnippetsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have snippets', () => {
    expect(service.snippets().length).toBeGreaterThanOrEqual(0);
  });

  it('should have filteredSnippets computed', () => {
    expect(service.filteredSnippets().length).toBeGreaterThanOrEqual(0);
  });
});
