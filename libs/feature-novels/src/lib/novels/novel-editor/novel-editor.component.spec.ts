import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NovelEditorComponent } from './novel-editor.component';

describe('NovelEditorComponent', () => {
  let component: NovelEditorComponent;
  let fixture: ComponentFixture<NovelEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovelEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NovelEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
