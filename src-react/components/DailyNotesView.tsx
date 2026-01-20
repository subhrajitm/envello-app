import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import './DailyNotesView.css';

const DailyNotesView: React.FC = () => {
    const { notes, addNote } = useStore();
    const [selectedEntryId, setSelectedEntryId] = useState<string>(notes[0]?.id || '');

    const handleNewNote = () => {
        const newNote = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            title: 'New Daily Note',
            preview: 'Start writing...',
            content: '<p>Start writing your thoughts...</p>'
        };
        addNote(newNote);
        setSelectedEntryId(newNote.id);
    };

    const selectedNote = notes.find(n => n.id === selectedEntryId) || notes[0];

    return (
        <div className="daily-notes-view">
            <div className="dn-sidebar">
                <div className="dn-sidebar-header-action">
                    <button className="dn-btn-new-entry" onClick={handleNewNote}>+ New Note</button>
                </div>
                <div className="dn-entries-list">
                    {notes.map(entry => (
                        <div
                            key={entry.id}
                            className={`dn-entry-item ${selectedEntryId === entry.id ? 'active' : ''}`}
                            onClick={() => setSelectedEntryId(entry.id)}
                        >
                            <div className="dn-entry-date">{entry.date}</div>
                            <div className="dn-entry-title">{entry.title}</div>
                            <div className="dn-entry-preview">{entry.preview}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="dn-editor">
                {selectedNote ? (
                    <>
                        <div className="dn-editor-header">
                            <div className="dn-editor-meta">
                                <span className="dn-editor-date">{selectedNote.date}</span>
                                <span className="dn-editor-time">09:15 AM</span>
                            </div>
                            <div className="dn-editor-actions">
                                <button className="dn-icon-btn-small"><span className="material-symbols-outlined">edit</span></button>
                                <button className="dn-icon-btn-small"><span className="material-symbols-outlined">delete</span></button>
                                <button className="dn-icon-btn-small"><span className="material-symbols-outlined">more_horiz</span></button>
                            </div>
                        </div>
                        <div className="dn-editor-content">
                            <h1 className="dn-entry-heading">{selectedNote.title}</h1>
                            <div className="dn-entry-body" dangerouslySetInnerHTML={{ __html: selectedNote.content }} />
                        </div>
                    </>
                ) : (
                    <div className="dn-empty-state">Select a note or create a new one.</div>
                )}
            </div>
        </div>
    );
};

export default DailyNotesView;
