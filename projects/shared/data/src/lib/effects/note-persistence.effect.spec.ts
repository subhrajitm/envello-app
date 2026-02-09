import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotePersistenceEffect } from './note-persistence.effect';
import { EventBus, NoteEvents, Note } from '@envello/shared-domain';
import { PersistenceAdapter } from '../adapters/persistence.adapter';
import { of } from 'rxjs';

describe('NotePersistenceEffect', () => {
    let effect: NotePersistenceEffect;
    let eventBus: jasmine.SpyObj<EventBus>;
    let persistence: jasmine.SpyObj<PersistenceAdapter>;

    const mockNote: Note = {
        id: '1',
        title: 'Test Note',
        date: new Date().toISOString(),
        preview: 'Test preview',
        content: '<p>Test content</p>',
        tags: []
    };

    beforeEach(() => {
        const eventBusSpy = jasmine.createSpyObj('EventBus', ['dispatch', 'on']);
        const persistenceSpy = jasmine.createSpyObj('PersistenceAdapter', ['upsertNote', 'saveNoteContent', 'deleteNote', 'loadNoteContent']);

        eventBusSpy.on.and.returnValue(of()); // Default

        TestBed.configureTestingModule({
            providers: [
                NotePersistenceEffect,
                { provide: EventBus, useValue: eventBusSpy },
                { provide: PersistenceAdapter, useValue: persistenceSpy }
            ]
        });

        effect = TestBed.inject(NotePersistenceEffect);
        eventBus = TestBed.inject(EventBus) as jasmine.SpyObj<EventBus>;
        persistence = TestBed.inject(PersistenceAdapter) as jasmine.SpyObj<PersistenceAdapter>;
    });

    it('should be created', () => {
        expect(effect).toBeTruthy();
    });

    it('should register for persistence events', () => {
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.CREATED);
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.UPDATED);
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.DELETED);
        expect(eventBus.on).toHaveBeenCalledWith(NoteEvents.CONTENT_LOADED);
    });

    // To test debounced save, we need to manually trigger the callback of eventBus.on(UPDATED)
    // capable of being mocked. Since we are using a spy, we can't easily access the callback 
    // unless we capture it.
});
