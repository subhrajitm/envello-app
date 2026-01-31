import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { QuickFindComponent } from './quick-find.component';
import { StoreService } from '../../services/store.service';

describe('QuickFindComponent', () => {
  let component: QuickFindComponent;
  let fixture: ComponentFixture<QuickFindComponent>;
  let router: Router;
  let storeService: jasmine.SpyObj<StoreService>;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('StoreService', [], {
      notes: jasmine.createSpy().and.returnValue([
        {
          id: '1',
          title: 'Test Note',
          preview: 'Preview text',
          date: 'Jan 1',
          tags: ['tag1'],
        },
      ]),
      tasks: jasmine.createSpy().and.returnValue([
        { id: 't1', title: 'Test Task', project: 'Project A', due: 'Today' },
      ]),
    });

    await TestBed.configureTestingModule({
      imports: [QuickFindComponent],
      providers: [
        provideRouter([]),
        { provide: StoreService, useValue: storeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickFindComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    storeService = TestBed.inject(StoreService) as jasmine.SpyObj<StoreService>;
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with modal closed', () => {
    expect(component.isOpen()).toBe(false);
  });

  it('should open and reset state', () => {
    component.searchQuery.set('old');
    component.selectedIndex.set(5);
    component.open();
    expect(component.isOpen()).toBe(true);
    expect(component.searchQuery()).toBe('');
    expect(component.selectedIndex()).toBe(0);
  });

  it('should close and clear search', () => {
    component.open();
    component.searchQuery.set('query');
    component.close();
    expect(component.isOpen()).toBe(false);
    expect(component.searchQuery()).toBe('');
  });

  it('should close on backdrop click', () => {
    component.open();
    component.onBackdropClick();
    expect(component.isOpen()).toBe(false);
  });

  it('should stop propagation on modal click', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');
    component.onModalClick(event);
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should perform search and limit to 10 results', () => {
    component.performSearch('test');
    expect(component.results().length).toBeLessThanOrEqual(10);
    expect(component.selectedIndex()).toBe(0);
  });

  it('should navigate and close on selectResult', () => {
    component.open();
    component.selectResult({
      id: '1',
      type: 'note',
      title: 'Test',
      preview: 'p',
      icon: 'description',
      route: '/daily-notes',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/daily-notes']);
    expect(component.isOpen()).toBe(false);
  });

  it('should do nothing when selectResult is called with undefined', () => {
    component.open();
    component.selectResult(undefined);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
