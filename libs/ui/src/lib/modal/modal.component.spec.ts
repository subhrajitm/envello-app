import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default inputs', () => {
    expect(component.isOpen).toBeFalse();
    expect(component.title).toBe('');
    expect(component.size).toBe('md');
    expect(component.showClose).toBeTrue();
  });

  it('should emit closed on overlay click', () => {
    const spy = jasmine.createSpy('closedSpy');
    component.closed.subscribe(spy);
    component.onOverlayClick();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit closed on onClose', () => {
    const spy = jasmine.createSpy('closedSpy');
    component.closed.subscribe(spy);
    component.onClose();
    expect(spy).toHaveBeenCalled();
  });

  it('should stop propagation on container click', () => {
    const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as unknown as Event;
    component.onContainerClick(mockEvent);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should accept size input', () => {
    component.size = 'xl';
    expect(component.size).toBe('xl');
  });
});
