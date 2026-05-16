import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { SignUpComponent } from './sign-up.component';
import { AuthService, UserService } from '@envello/core';

describe('SignUpComponent', () => {
  let component: SignUpComponent;
  let fixture: ComponentFixture<SignUpComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const isAuthSignal = signal(false);

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['signUp'], {
      isAuthenticated: isAuthSignal,
    });
    authSpy.signUp.and.returnValue(Promise.resolve(true));

    const userSpy = jasmine.createSpyObj('UserService', ['createProfile']);

    await TestBed.configureTestingModule({
      imports: [SignUpComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: UserService, useValue: userSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to step 1', () => {
    expect(component.currentStep()).toBe(1);
  });

  it('should not be loading by default', () => {
    expect(component.loading()).toBeFalse();
  });

  it('should have no error by default', () => {
    expect(component.error()).toBeNull();
  });

  it('prevStep should not go below step 1', () => {
    component.prevStep();
    expect(component.currentStep()).toBe(1);
  });
});
