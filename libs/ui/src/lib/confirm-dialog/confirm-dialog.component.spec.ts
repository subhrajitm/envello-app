import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default inputs', () => {
    expect(component.isOpen).toBeFalse();
    expect(component.title).toBe('Are you sure?');
    expect(component.icon).toBe('');
    expect(component.variant).toBe('danger');
    expect(component.confirmLabel).toBe('Confirm');
    expect(component.cancelLabel).toBe('Cancel');
  });

  it('should emit confirmed output', () => {
    const spy = jasmine.createSpy('confirmedSpy');
    component.confirmed.subscribe(spy);
    component.confirmed.emit();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit cancelled output', () => {
    const spy = jasmine.createSpy('cancelledSpy');
    component.cancelled.subscribe(spy);
    component.cancelled.emit();
    expect(spy).toHaveBeenCalled();
  });

  it('should accept isOpen input', () => {
    component.isOpen = true;
    expect(component.isOpen).toBeTrue();
  });

  it('should accept variant input', () => {
    component.variant = 'success';
    expect(component.variant).toBe('success');
  });
});
