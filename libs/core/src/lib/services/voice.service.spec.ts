import { TestBed } from '@angular/core/testing';
import { VoiceService } from './voice.service';

describe('VoiceService', () => {
  let service: VoiceService;
  let mockRecognition: any;

  beforeEach(() => {
    mockRecognition = {
      continuous: false,
      interimResults: false,
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop'),
      onstart: null,
      onend: null,
      onresult: null,
      onerror: null,
    };

    (window as any).SpeechRecognition = jasmine.createSpy('SpeechRecognition').and.returnValue(mockRecognition);
    delete (window as any).webkitSpeechRecognition;

    TestBed.configureTestingModule({});
    service = TestBed.inject(VoiceService);
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should initialise with voice inactive', () => {
    expect(service.isVoiceActive()).toBeFalse();
  });

  it('should start recognition when toggled on', () => {
    service.toggleVoice();
    expect(service.isVoiceActive()).toBeTrue();
    expect(mockRecognition.start).toHaveBeenCalled();
  });

  it('should stop recognition when toggled off', () => {
    service.toggleVoice();       // on → start called
    mockRecognition.onstart();   // simulate recognition started
    service.toggleVoice();       // off → stop called
    expect(service.isVoiceActive()).toBeFalse();
    expect(mockRecognition.stop).toHaveBeenCalled();
  });

  it('should set isVoiceActive to false on not-allowed error', () => {
    service.toggleVoice();
    mockRecognition.onerror({ error: 'not-allowed' });
    expect(service.isVoiceActive()).toBeFalse();
  });

  it('should not change state on no-speech error', () => {
    service.toggleVoice();
    const consoleSpy = spyOn(console, 'error');
    mockRecognition.onerror({ error: 'no-speech' });
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(service.isVoiceActive()).toBeTrue();
  });

  it('should insert transcript into focused input element', () => {
    const input = document.createElement('input');
    input.value = 'hello ';
    document.body.appendChild(input);
    input.focus();
    input.setSelectionRange(6, 6);

    mockRecognition.onresult({
      resultIndex: 0,
      results: [Object.assign([{ transcript: 'world' }], { isFinal: true })],
    });

    expect(input.value).toBe('hello world');
    document.body.removeChild(input);
  });

  it('should gracefully handle missing Speech Recognition API', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    const warnSpy = spyOn(console, 'warn');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(VoiceService);
    expect(newService).toBeTruthy();
    expect(warnSpy).toHaveBeenCalledWith(jasmine.stringContaining('not available'));
  });
});
