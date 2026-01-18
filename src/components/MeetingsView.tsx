import React, { useState } from 'react';
import './MeetingsView.css';

interface Meeting {
    id: string;
    title: string;
    date: string;
    time: string;
    attendees: string[];
    tags: string[];
    status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
}

const MeetingsView: React.FC = () => {
    const [meetings] = useState<Meeting[]>([
        {
            id: '1',
            title: 'Weekly Sync: Narrative Team',
            date: 'Oct 24, 2023',
            time: '14:00 - 15:00',
            attendees: ['Sarah J.', 'Marcus T.', 'Elara V.'],
            tags: ['Recurring', 'Plot'],
            status: 'UPCOMING'
        },
        {
            id: '2',
            title: 'Environment Concept Review',
            date: 'Oct 22, 2023',
            time: '10:00 - 11:30',
            attendees: ['Art Dept', 'Sarah J.'],
            tags: ['Art', 'Design'],
            status: 'COMPLETED'
        },
        {
            id: '3',
            title: 'Publisher Call: Q4 Strategy',
            date: 'Oct 20, 2023',
            time: '16:00 - 17:00',
            attendees: ['Agent', 'Marketing'],
            tags: ['Business'],
            status: 'COMPLETED'
        }
    ]);

    return (
        <div className="meetings-view">
            <div className="meetings-header">
                <h2 className="header-title">Meetings & Agenda</h2>
                <div className="header-controls">
                    <button className="control-btn active">List</button>
                    <button className="control-btn">Calendar</button>
                    <button className="btn-primary">+ Schedule</button>
                </div>
            </div>

            <div className="meetings-grid">
                <div className="upcoming-section">
                    <h3 className="section-heading">Upcoming</h3>
                    <div className="meeting-cards">
                        {meetings.filter(m => m.status === 'UPCOMING').map(meeting => (
                            <div key={meeting.id} className="meeting-card upcoming">
                                <div className="card-stripe"></div>
                                <div className="card-content">
                                    <div className="meeting-time">
                                        <span className="material-symbols-outlined icon-tiny">schedule</span>
                                        {meeting.date} · {meeting.time}
                                    </div>
                                    <div className="meeting-title">{meeting.title}</div>
                                    <div className="meeting-attendees">
                                        {meeting.attendees.map(a => <span key={a} className="attendee-chip">{a}</span>)}
                                    </div>
                                    <div className="meeting-tags">
                                        {meeting.tags.map(t => <span key={t} className="tag-chip">#{t}</span>)}
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <button className="action-btn">Join</button>
                                    <button className="icon-btn-small">...</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="past-section">
                    <h3 className="section-heading">Past / Completed</h3>
                    <div className="past-list">
                        {meetings.filter(m => m.status === 'COMPLETED').map(meeting => (
                            <div key={meeting.id} className="past-row">
                                <div className="past-date">{meeting.date}</div>
                                <div className="past-info">
                                    <div className="past-title">{meeting.title}</div>
                                    <div className="past-attendees">{meeting.attendees.length} Attendees</div>
                                </div>
                                <div className="past-actions">
                                    <button className="text-btn">View Notes</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingsView;
