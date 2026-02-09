import { TestBed } from '@angular/core/testing';
import { NoteReducer } from './note.reducer';
import { NoteStore } from '../stores/note.store';
import { EventBus, NoteEvents, Note } from '@envello/shared-domain';
import { of } from 'rxjs';

describe('NoteReducer', () => {
    let reducer: NoteReducer;
    let store: jasmine.SpyObj<NoteStore>;
    let eventBus: jasmine.SpyObj<EventBus>;

    const mockNote: Note = {
        id: '1',
        title: 'Test Note',
        date: new Date().toISOString(),
        preview: 'Test preview',
        content: '<p>Test content</p>',
        tags: []
    };

    beforeEach(() => {
        const storeSpy = jasmine.createSpyObj('NoteStore', ['addNote', 'updateNote', 'removeNote', 'setNotes']);
        const eventBusSpy = jasmine.createSpyObj('EventBus', ['on']);
        eventBusSpy.on.and.returnValue(of()); // Default return value

        TestBed.configureTestingModule({
            providers: [
                NoteReducer,
                { provide: NoteStore, useValue: storeSpy },
                { provide: EventBus, useValue: eventBusSpy }
            ]
        });

        reducer = TestBed.inject(NoteReducer);
        store = TestBed.inject(NoteStore) as jasmine.SpyObj<NoteStore>;
        eventBus = TestBed.inject(EventBus) as jasmine.SpyObj<EventBus>;
    });

    it('should be created', () => {
        expect(reducer).toBeTruthy();
    });

    // We can't easily test the subscription logic without mocking the EventBus.on return value 
    // and manually triggering the callback, or refactoring the reducer to expose handlers.
    // However, since we spy on EventBus.on, we can at least verify that it registers for events.

    it('should register for NoteEvents', () => {
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.CREATED);
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.UPDATED);
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.DELETED);
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.CONTENT_LOADED);
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.TAG_ADDED);
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.TAG_REMOVED);
    });

    // To test the actual logic inside the subscription, we would need to mock the Observable 
    // returned by eventBus.on to emit a value.
});
