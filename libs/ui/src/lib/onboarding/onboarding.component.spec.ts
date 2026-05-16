import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnboardingComponent } from './onboarding.component';
import { ThemeService, AiService } from '@envello/core';

describe('OnboardingComponent', () => {
  let component: OnboardingComponent;
  let fixture: ComponentFixture<OnboardingComponent>;

  beforeEach(async () => {
    const themeSpy = jasmine.createSpyObj('ThemeService', ['setTheme', 'toggleTheme']);
    const aiSpy = jasmine.createSpyObj('AiService', ['setProvider', 'sendMessage']);

    await TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        { provide: ThemeService, useValue: themeSpy },
        { provide: AiService,    useValue: aiSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to closed and step 1', () => {
    expect(component.isOpen()).toBeFalse();
    expect(component.step()).toBe(1);
  });

  it('should have use cases defined', () => {
    expect(component.useCases.length).toBeGreaterThan(0);
  });
});
