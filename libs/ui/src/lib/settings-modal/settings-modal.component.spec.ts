import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SettingsModalComponent } from './settings-modal.component';
import { ThemeService, AiService } from '@envello/core';

describe('SettingsModalComponent', () => {
  let component: SettingsModalComponent;
  let fixture: ComponentFixture<SettingsModalComponent>;

  beforeEach(async () => {
    const themeSpy = jasmine.createSpyObj('ThemeService',
      ['setTheme', 'toggleTheme'],
      { theme: signal('dark') }
    );
    const aiSpy = jasmine.createSpyObj('AiService',
      ['setProvider', 'sendMessage', 'modelName', 'apiKey'],
      { provider: signal('mock') }
    );
    aiSpy.modelName.and.returnValue('');
    aiSpy.apiKey.and.returnValue('');

    await TestBed.configureTestingModule({
      imports: [SettingsModalComponent],
      providers: [
        { provide: ThemeService, useValue: themeSpy },
        { provide: AiService,    useValue: aiSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be closed by default', () => {
    expect(component.isOpen()).toBeFalse();
  });

  it('open should set isOpen to true', () => {
    component.open();
    expect(component.isOpen()).toBeTrue();
  });

  it('close should set isOpen to false', () => {
    component.open();
    component.close();
    expect(component.isOpen()).toBeFalse();
  });
});
