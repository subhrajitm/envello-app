import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeSnippetsComponent } from './code-snippets.component';
import { SnippetsService } from '../../services/snippets.service';

describe('CodeSnippetsComponent', () => {
  let component: CodeSnippetsComponent;
  let fixture: ComponentFixture<CodeSnippetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeSnippetsComponent],
      providers: [SnippetsService],
    }).compileComponents();

    fixture = TestBed.createComponent(CodeSnippetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have view filter and search', () => {
    expect(component.viewFilter()).toBeDefined();
    expect(component.searchQuery()).toBeDefined();
  });

  it('should have filtered snippets from service', () => {
    expect(component.filteredSnippets().length).toBeGreaterThanOrEqual(0);
  });
});
