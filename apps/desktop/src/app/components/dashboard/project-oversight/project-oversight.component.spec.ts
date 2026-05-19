import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ProjectOversightComponent } from './project-oversight.component';
import { StoreService } from '@envello/core';

describe('ProjectOversightComponent', () => {
  let component: ProjectOversightComponent;
  let fixture: ComponentFixture<ProjectOversightComponent>;

  beforeEach(async () => {
    const storeSpy = { spaces: signal([]) };

    await TestBed.configureTestingModule({
      imports: [ProjectOversightComponent],
      providers: [
        provideRouter([]),
        { provide: StoreService, useValue: storeSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectOversightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
