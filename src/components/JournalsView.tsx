import React, { useState } from 'react';
import './JournalsView.css';

const JournalsView: React.FC = () => {
    const [selectedEntry, setSelectedEntry] = useState('1');

    const entries = [
        { id: '1', date: 'Oct 19, 2023', title: 'Reflections on Chapter 4 Pacing', preview: 'The dialogue felt a bit stilted in the second scene...' },
        { id: '2', date: 'Oct 18, 2023', title: 'Worldbuilding: The market district', preview: 'Need to add more sensory details about the spices...' },
        { id: '3', date: 'Oct 17, 2023', title: 'Character Arc: Marcus', preview: 'He needs a stronger motivation for leaving...' },
        { id: '4', date: 'Oct 15, 2023', title: 'Weekly Goals Review', preview: 'Met the word count goal but missed the research...' },
    ];

    return (
        <div className="journals-view">
            <div className="journals-sidebar">
                <div className="sidebar-header-action">
                    <button className="btn-new-entry">+ New Entry</button>
                </div>
                <div className="entries-list">
                    {entries.map(entry => (
                        <div
                            key={entry.id}
                            className={`entry-item ${selectedEntry === entry.id ? 'active' : ''}`}
                            onClick={() => setSelectedEntry(entry.id)}
                        >
                            <div className="entry-date">{entry.date}</div>
                            <div className="entry-title">{entry.title}</div>
                            <div className="entry-preview">{entry.preview}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="journals-editor">
                <div className="editor-header">
                    <div className="editor-meta">
                        <span className="editor-date">October 19, 2023</span>
                        <span className="editor-time">10:42 AM</span>
                    </div>
                    <div className="editor-actions">
                        <button className="icon-btn-small"><span className="material-symbols-outlined">edit</span></button>
                        <button className="icon-btn-small"><span className="material-symbols-outlined">delete</span></button>
                        <button className="icon-btn-small"><span className="material-symbols-outlined">more_horiz</span></button>
                    </div>
                </div>
                <div className="editor-content">
                    <h1 className="entry-heading">Reflections on Chapter 4 Pacing</h1>
                    <div className="entry-body">
                        <p>The dialogue felt a bit stilted in the second scene. I need to make Marcus sound more hesitant when he reveals the map. Currently, he's too confident which undermines the tension.</p>
                        <p><strong>Action Items:</strong></p>
                        <ul>
                            <li>Rewrite the tavern scene dialogue.</li>
                            <li>Add internal monologue for Sarah regarding the map's authenticity.</li>
                        </ul>
                        <p>Also, the transition to the docks is too abrupt. Maybe add a short travel sequence describing the fog?</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JournalsView;
