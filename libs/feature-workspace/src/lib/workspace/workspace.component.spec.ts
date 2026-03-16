import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspaceComponent } from './workspace.component';
import { StoreService } from '@envello/core';

describe('WorkspaceComponent', () => {
  let component: WorkspaceComponent;
  let fixture: ComponentFixture<WorkspaceComponent>;

  // Mock StoreService
  const storeServiceMock = {
    tasks: () => [],
    planningItems: () => [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceComponent],
      providers: [{ provide: StoreService, useValue: storeServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render voice protocol container', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.voice-protocol-container')).toBeTruthy();
  });
});
