import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiAssistantPanelComponent } from './ai-assistant-panel.component';

describe('AiAssistantPanelComponent', () => {
  let component: AiAssistantPanelComponent;
  let fixture: ComponentFixture<AiAssistantPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAssistantPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AiAssistantPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.title()).toBe('AI Assistant');
    expect(component.placeholder()).toBe('Ask me anything…');
    expect(component.suggestions()).toEqual([]);
    expect(component.messages()).toEqual([]);
    expect(component.loading()).toBeFalse();
  });

  it('onSend should emit send with trimmed inputText and clear it', () => {
    const spy = jasmine.createSpy('sendSpy');
    component.send.subscribe(spy);
    component.inputText.set('  hello world  ');
    component.onSend();
    expect(spy).toHaveBeenCalledWith('hello world');
    expect(component.inputText()).toBe('');
  });

  it('onSend should not emit when inputText is empty', () => {
    const spy = jasmine.createSpy('sendSpy');
    component.send.subscribe(spy);
    component.inputText.set('');
    component.onSend();
    expect(spy).not.toHaveBeenCalled();
  });

  it('onSuggestionClick should emit the suggestion text', () => {
    const spy = jasmine.createSpy('sendSpy');
    component.send.subscribe(spy);
    component.onSuggestionClick('summarize');
    expect(spy).toHaveBeenCalledWith('summarize');
  });
});
