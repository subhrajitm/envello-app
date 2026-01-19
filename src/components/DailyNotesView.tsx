import React, { useState } from 'react';
import './DailyNotesView.css';

const DailyNotesView: React.FC = () => {
    const [selectedEntry, setSelectedEntry] = useState('1');

    const entries = [
        { id: '1', date: 'Oct 19, 2023', title: 'Daily Standup & Goals', preview: 'Focus on the API integration today...' },
        { id: '2', date: 'Oct 18, 2023', title: 'Meeting Notes: Design Team', preview: 'Discusssed the new typography system...' },
        { id: '3', date: 'Oct 17, 2023', title: 'Quick thoughts on architecture', preview: 'Microservices might be overkill for phase 1...' },
        { id: '4', date: 'Oct 15, 2023', title: 'Weekly Review', preview: 'Productivity dropped on Thursday due to...' },
    ];

    return (
        <div className="daily-notes-view">
            <div className="dn-sidebar">
                <div className="dn-sidebar-header-action">
                    <button className="dn-btn-new-entry">+ New Note</button>
                </div>
                <div className="dn-entries-list">
                    {entries.map(entry => (
                        <div
                            key={entry.id}
                            className={`dn-entry-item ${selectedEntry === entry.id ? 'active' : ''}`}
                            onClick={() => setSelectedEntry(entry.id)}
                        >
                            <div className="dn-entry-date">{entry.date}</div>
                            <div className="dn-entry-title">{entry.title}</div>
                            <div className="dn-entry-preview">{entry.preview}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="dn-editor">
                <div className="dn-editor-header">
                    <div className="dn-editor-meta">
                        <span className="dn-editor-date">October 19, 2023</span>
                        <span className="dn-editor-time">09:15 AM</span>
                    </div>
                    <div className="dn-editor-actions">
                        <button className="dn-icon-btn-small"><span className="material-symbols-outlined">edit</span></button>
                        <button className="dn-icon-btn-small"><span className="material-symbols-outlined">delete</span></button>
                        <button className="dn-icon-btn-small"><span className="material-symbols-outlined">more_horiz</span></button>
                    </div>
                </div>
                <div className="dn-editor-content">
                    <h1 className="dn-entry-heading">Daily Standup & Goals</h1>
                    <div className="dn-entry-body">
                        <p><strong>Today's Focus:</strong></p>
                        <ul>
                            <li>Finish the Auth API integration.</li>
                            <li>Review PR #42 from Sarah.</li>
                            <li>Prepare slides for Friday demo.</li>
                        </ul>
                        <p><strong>Notes:</strong></p>
                        <p>Need to double check the JWT expiration settings. The current config is causing logouts too frequently.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyNotesView;
