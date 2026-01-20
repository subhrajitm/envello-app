import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrainstormingComponent } from './brainstorming.component';

describe('BrainstormingComponent', () => {
  let component: BrainstormingComponent;
  let fixture: ComponentFixture<BrainstormingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrainstormingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrainstormingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
