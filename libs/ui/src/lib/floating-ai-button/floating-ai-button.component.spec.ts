import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloatingAiButtonComponent } from './floating-ai-button.component';
import { AiService } from '@envello/core';

describe('FloatingAiButtonComponent', () => {
  let component: FloatingAiButtonComponent;
  let fixture: ComponentFixture<FloatingAiButtonComponent>;
  let aiServiceSpy: jasmine.SpyObj<AiService>;

  beforeEach(async () => {
    aiServiceSpy = jasmine.createSpyObj('AiService', ['sendMessage']);
    aiServiceSpy.sendMessage.and.returnValue(Promise.resolve('AI response'));

    await TestBed.configureTestingModule({
      imports: [FloatingAiButtonComponent],
      providers: [{ provide: AiService, useValue: aiServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingAiButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to closed state', () => {
    expect(component.isOpen()).toBeFalse();
  });

  it('toggle should flip isOpen', () => {
    component.toggle();
    expect(component.isOpen()).toBeTrue();
    component.toggle();
    expect(component.isOpen()).toBeFalse();
  });

  it('close should set isOpen to false', () => {
    component.toggle();
    component.close();
    expect(component.isOpen()).toBeFalse();
  });

  it('send should not call aiService when prompt is empty', async () => {
    component.prompt.set('');
    await component.send();
    expect(aiServiceSpy.sendMessage).not.toHaveBeenCalled();
  });

  it('send should call aiService.sendMessage with trimmed prompt', async () => {
    component.prompt.set('  hello  ');
    await component.send();
    expect(aiServiceSpy.sendMessage).toHaveBeenCalledWith('hello');
  });

  it('send should add user and assistant messages', async () => {
    component.prompt.set('hello');
    await component.send();
    expect(component.messages().length).toBe(2);
    expect(component.messages()[0]).toEqual({ role: 'user', content: 'hello' });
    expect(component.messages()[1]).toEqual({ role: 'assistant', content: 'AI response' });
  });

  it('send should set isLoading to false after completion', async () => {
    component.prompt.set('hello');
    await component.send();
    expect(component.isLoading()).toBeFalse();
  });
});
