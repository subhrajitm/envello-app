import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectOversightComponent } from './project-oversight.component';

describe('ProjectOversightComponent', () => {
  let component: ProjectOversightComponent;
  let fixture: ComponentFixture<ProjectOversightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectOversightComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectOversightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
