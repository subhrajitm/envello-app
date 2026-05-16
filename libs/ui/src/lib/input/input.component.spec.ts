import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputComponent } from './input.component';

describe('InputComponent', () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default inputs', () => {
    expect(component.label).toBe('');
    expect(component.placeholder).toBe('');
    expect(component.type).toBe('text');
    expect(component.disabled).toBeFalse();
    expect(component.value).toBe('');
  });

  it('should write value via writeValue', () => {
    component.writeValue('hello');
    expect(component.value).toBe('hello');
  });

  it('should treat null/undefined as empty string in writeValue', () => {
    component.writeValue(null as unknown as string);
    expect(component.value).toBe('');
  });

  it('should register onChange callback', () => {
    const cb = jasmine.createSpy('onChange');
    component.registerOnChange(cb);
    component.onChange('test');
    expect(cb).toHaveBeenCalledWith('test');
  });

  it('should register onTouched callback', () => {
    const cb = jasmine.createSpy('onTouched');
    component.registerOnTouched(cb);
    component.onTouched();
    expect(cb).toHaveBeenCalled();
  });

  it('should update disabled state via setDisabledState', () => {
    component.setDisabledState(true);
    expect(component.disabled).toBeTrue();
    component.setDisabledState(false);
    expect(component.disabled).toBeFalse();
  });

  it('should update value and call onChange on input event', () => {
    const cb = jasmine.createSpy('onChange');
    component.registerOnChange(cb);
    const mockEvent = { target: { value: 'typed' } } as unknown as Event;
    component.onInput(mockEvent);
    expect(component.value).toBe('typed');
    expect(cb).toHaveBeenCalledWith('typed');
  });
});
