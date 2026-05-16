import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BookmarksComponent } from './bookmarks.component';
import { StoreService } from '@envello/core';

describe('BookmarksComponent', () => {
  let component: BookmarksComponent;
  let fixture: ComponentFixture<BookmarksComponent>;
  let storeSpy: jasmine.SpyObj<StoreService>;

  const mockBookmarks = signal<unknown[]>([]);
  const mockFolders = signal<unknown[]>([]);

  beforeEach(async () => {
    storeSpy = jasmine.createSpyObj('StoreService', ['addBookmark', 'updateBookmark', 'deleteBookmark', 'addBookmarkFolder', 'deleteBookmarkFolder'], {
      bookmarks: mockBookmarks,
      bookmarkFolders: mockFolders,
    });

    await TestBed.configureTestingModule({
      imports: [BookmarksComponent],
      providers: [{ provide: StoreService, useValue: storeSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(BookmarksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to table view mode', () => {
    expect(component.viewMode()).toBe('table');
  });

  it('should default selectedView to all', () => {
    expect(component.selectedView()).toBe('all');
  });

  it('should default searchQuery to empty string', () => {
    expect(component.searchQuery()).toBe('');
  });

  it('should default sortBy to createdAt', () => {
    expect(component.sortBy()).toBe('createdAt');
  });
});
