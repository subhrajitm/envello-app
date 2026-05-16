import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvLogoComponent } from './logo.component';

describe('EnvLogoComponent', () => {
  let component: EnvLogoComponent;
  let fixture: ComponentFixture<EnvLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvLogoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EnvLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default dimensions', () => {
    expect(component.height).toBe('28px');
    expect(component.width).toBe('auto');
  });

  it('should accept custom height', () => {
    component.height = '48px';
    expect(component.height).toBe('48px');
  });

  it('should accept custom width', () => {
    component.width = '120px';
    expect(component.width).toBe('120px');
  });

  it('should render an svg element', () => {
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
