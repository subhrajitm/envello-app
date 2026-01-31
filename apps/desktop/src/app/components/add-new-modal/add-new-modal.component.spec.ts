import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AddNewModalComponent } from './add-new-modal.component';

describe('AddNewModalComponent', () => {
  let component: AddNewModalComponent;
  let fixture: ComponentFixture<AddNewModalComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddNewModalComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AddNewModalComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with modal closed', () => {
    expect(component.isOpen()).toBe(false);
  });

  it('should have 8 add-new options', () => {
    expect(component.options.length).toBe(8);
  });

  it('should open and close modal', () => {
    component.open();
    expect(component.isOpen()).toBe(true);
    component.close();
    expect(component.isOpen()).toBe(false);
  });

  it('should navigate and close on option select', () => {
    component.open();
    const option = component.options[0];
    component.selectOption(option);
    expect(router.navigate).toHaveBeenCalledWith([option.route]);
    expect(component.isOpen()).toBe(false);
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

  it('should have Daily Note as first option', () => {
    expect(component.options[0].id).toBe('note');
    expect(component.options[0].title).toBe('Daily Note');
    expect(component.options[0].route).toBe('/daily-notes');
  });
});
