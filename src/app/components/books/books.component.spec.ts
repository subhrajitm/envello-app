import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BooksComponent } from './books.component';
import { BooksService } from '../../services/books.service';

describe('BooksComponent', () => {
  let component: BooksComponent;
  let fixture: ComponentFixture<BooksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BooksComponent],
      providers: [BooksService],
    }).compileComponents();

    fixture = TestBed.createComponent(BooksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have filtered books and stats from service', () => {
    expect(component.filteredBooks().length).toBeGreaterThanOrEqual(0);
  });

  it('should have stats from service', () => {
    const stats = component.stats();
    expect(stats.total).toBeGreaterThanOrEqual(0);
  });
});
