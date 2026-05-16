import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '@envello/core';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const isAuthSignal = signal(false);

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['login', 'signUp'], {
      isAuthenticated: isAuthSignal,
    });
    authSpy.login.and.returnValue(Promise.resolve(true));
    authSpy.signUp.and.returnValue(Promise.resolve(true));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router,      useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to not loading and no error', () => {
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('handleLogin should set error when email is empty', async () => {
    component.email = '';
    component.password = 'pass';
    await component.handleLogin();
    expect(component.error()).toBe('Please fill in all fields');
    expect(authSpy.login).not.toHaveBeenCalled();
  });

  it('handleLogin should set error when password is empty', async () => {
    component.email = 'test@example.com';
    component.password = '';
    await component.handleLogin();
    expect(component.error()).toBe('Please fill in all fields');
  });

  it('handleLogin should call authService.login with credentials', async () => {
    component.email = 'user@example.com';
    component.password = 'secret';
    await component.handleLogin();
    expect(authSpy.login).toHaveBeenCalledWith('user@example.com', 'secret');
  });

  it('handleLogin should set error on failed login', async () => {
    authSpy.login.and.returnValue(Promise.resolve(false));
    component.email = 'u@e.com';
    component.password = 'wrong';
    await component.handleLogin();
    expect(component.error()).toBe('Invalid credentials or login failed.');
  });

  it('handleLogin should set loading back to false after completion', async () => {
    component.email = 'u@e.com';
    component.password = 'pass';
    await component.handleLogin();
    expect(component.loading()).toBeFalse();
  });
});
