import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { KeyboardShortcutsComponent } from './keyboard-shortcuts.component';
import { KeyboardShortcutsService } from './keyboard-shortcuts.service';

describe('KeyboardShortcutsComponent', () => {
  let component: KeyboardShortcutsComponent;
  let fixture: ComponentFixture<KeyboardShortcutsComponent>;
  let svcSpy: jasmine.SpyObj<KeyboardShortcutsService>;

  const isOpenSignal = signal(false);

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj('KeyboardShortcutsService', ['toggle', 'open', 'close'], {
      isOpen: isOpenSignal,
    });

    await TestBed.configureTestingModule({
      imports: [KeyboardShortcutsComponent],
      providers: [{ provide: KeyboardShortcutsService, useValue: svcSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyboardShortcutsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggle should call service toggle', () => {
    component.toggle();
    expect(svcSpy.toggle).toHaveBeenCalled();
  });

  it('open should call service open', () => {
    component.open();
    expect(svcSpy.open).toHaveBeenCalled();
  });

  it('close should call service close', () => {
    component.close();
    expect(svcSpy.close).toHaveBeenCalled();
  });

  it('should have shortcut groups defined', () => {
    expect(component.groups.length).toBeGreaterThan(0);
  });
});
