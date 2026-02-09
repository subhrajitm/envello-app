import { TestBed } from '@angular/core/testing';
import { NoteStore } from './note.store';
import { Note } from '@envello/shared-domain';

describe('NoteStore', () => {
    let store: NoteStore;

    const mockNote: Note = {
        id: '1',
        title: 'Test Note',
        date: new Date().toISOString(),
        preview: 'Test preview',
        content: '<p>Test content</p>',
        tags: ['test', 'important']
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [NoteStore]
        });
        store = TestBed.inject(NoteStore);
    });

    it('should be created', () => {
        expect(store).toBeTruthy();
    });

    it('should start with empty notes', () => {
        expect(store.notes()).toEqual([]);
    });

    it('should set notes', () => {
        store.setNotes([mockNote]);
        expect(store.notes().length).toBe(1);
        expect(store.notes()[0]).toEqual(mockNote);
    });

    it('should add a note', () => {
        store.addNote(mockNote);
        expect(store.notes().length).toBe(1);
        expect(store.notes()[0]).toEqual(mockNote);
    });

    it('should update a note', () => {
        store.setNotes([mockNote]);
        store.updateNote('1', { title: 'Updated Title' });

        const updatedNote = store.noteById('1')();
        expect(updatedNote?.title).toBe('Updated Title');
        expect(updatedNote?.content).toBe(mockNote.content); // Should preserve other fields
    });

    it('should remove a note', () => {
        store.setNotes([mockNote]);
        store.removeNote('1');
        expect(store.notes().length).toBe(0);
    });

    it('should filter notes by tag', () => {
        const note2 = { ...mockNote, id: '2', tags: ['other'] };
        store.setNotes([mockNote, note2]);

        const testTags = store.notesByTag('test')();
        expect(testTags.length).toBe(1);
        expect(testTags[0].id).toBe('1');
    });

    it('should return recent notes', () => {
        const notes = Array.from({ length: 15 }, (_, i) => ({
            ...mockNote,
            id: `${i}`,
            title: `Note ${i}`
        }));
        store.setNotes(notes);

        expect(store.recentNotes().length).toBe(10);
    });
});
