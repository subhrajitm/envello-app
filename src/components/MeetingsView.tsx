import React, { useState } from 'react';
import './MeetingsView.css';
import GlobalTasks from './GlobalTasks';

interface Meeting {
    id: string;
    title: string;
    date: string;
    day: string;
    time: string;
    attendees: string[];
    status: 'ONLINE' | 'IN_PERSON' | 'CANCELLED';
    activity?: string;
}

const MeetingsView: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState('26 THU');

    const calendarDays = [
        { date: '22', day: 'SUN' },
        { date: '23', day: 'MON' },
        { date: '24', day: 'TUE' },
        { date: '25', day: 'WED' },
        { date: '26', day: 'THU', active: true },
        { date: '27', day: 'FRI' },
        { date: '28', day: 'SAT' },
        { date: '29', day: 'SUN' },
        { date: '30', day: 'MON' },
    ];

    const meetings: Meeting[] = [
        {
            id: '1',
            title: 'Weekly Sync: Narrative Team',
            date: 'Oct 26',
            day: 'THU',
            time: '14:00 - 15:00',
            attendees: ['Sarah J.', 'Marcus T.', 'Elara V.'],
            status: 'ONLINE',
            activity: 'Refining internal monologue for Ch 4'
        },
        {
            id: '2',
            title: 'Environment Concept Review',
            date: 'Oct 26',
            day: 'THU',
            time: '16:30 - 17:30',
            attendees: ['Art Dept'],
            status: 'IN_PERSON',
            activity: 'Finalizing aesthetics for Neon Orchard'
        },
        {
            id: '3',
            title: 'Publisher Call: Q4 Strategy',
            date: 'Oct 26',
            day: 'THU',
            time: '19:00 - 20:00',
            attendees: ['Agent'],
            status: 'ONLINE',
            activity: 'Discussing marketing roadmap'
        }
    ];

    const logs = [
        { id: 1, text: 'Edited Chapter 3 in Project Alpha' },
        { id: 2, text: 'New Research Note added to Neon Orchard' },
    ];

    return (
        <div className="meetings-view-new">
            {/* Top Metrics Strip */}
            <div className="metrics-strip">
                <div className="metric-unit">
                    <span className="metric-label">PRODUCTIVITY</span>
                    <span className="metric-val">84.2</span>
                    <span className="metric-trend success">+5.2%</span>
                </div>
                <div className="metric-unit">
                    <span className="metric-label">ACTIVE</span>
                    <span className="metric-val">12</span>
                </div>
                <div className="metric-unit">
                    <span className="metric-label">WEEKLY COUNT</span>
                    <span className="metric-val">14,250</span>
                    <span className="metric-sub">/ 20K</span>
                </div>
                <div className="metric-unit">
                    <span className="metric-label">NEXT DEADLINE</span>
                    <span className="metric-val">2 DAYS</span>
                </div>
            </div>

            {/* Date Navigation */}
            <div className="date-nav-strip">
                <div className="month-label">
                    OCTOBER 2023 <span className="material-symbols-outlined icon-small">expand_more</span>
                </div>
                <div className="calendar-scroll">
                    {calendarDays.map((d, i) => (
                        <div
                            key={i}
                            className={`calendar-day ${d.active ? 'active' : ''}`}
                            onClick={() => setSelectedDate(`${d.date} ${d.day}`)}
                        >
                            <span className="day-date">{d.date}</span>
                            <span className="day-name">{d.day}</span>
                        </div>
                    ))}
                </div>
                <div className="show-all-btn">SHOW ALL</div>
            </div>

            <div className="meetings-content-area">
                <div className="meetings-main-list">
                    <div className="list-headers">
                        <div className="col-header col-project">MEETING</div>
                        <div className="col-header col-status">STATUS</div>
                        <div className="col-header col-activity">ACTIVITY</div>
                    </div>

                    <div className="list-rows">
                        {meetings.map((m) => (
                            <div key={m.id} className="list-row">
                                <div className="col-project">
                                    <div className="meeting-title-lg">{m.title}</div>
                                </div>
                                <div className="col-status">
                                    <span className="status-text">{m.status}</span>
                                </div>
                                <div className="col-activity">
                                    <div className="activity-info">
                                        <div className="activity-time">{m.time}</div>
                                        {/* <div className="activity-desc">{m.activity}</div> */}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="log-section">
                        <div className="log-header">LOG</div>
                        {logs.map(log => (
                            <div key={log.id} className="log-item">
                                <span className="log-dot"></span>
                                {log.text}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="meetings-sidebar">
                    <div className="sidebar-header">
                        GLOBAL TASKS
                    </div>
                    {/* Reusing GlobalTasks logic but simplified markup for this view if needed, 
                        or just static for visual match. Using standard GlobalTasks component might conflict style. 
                        Let's build a simple one matching the image. */}
                    <div className="mini-task-list">
                        <div className="mini-task-item">
                            <div className="checkbox-box"></div>
                            <div className="mini-task-content">
                                <div className="mini-task-title">Review editor comments</div>
                                <div className="mini-task-sub">HIGH PRIORITY</div>
                            </div>
                        </div>
                        <div className="mini-task-item">
                            <div className="checkbox-box"></div>
                            <div className="mini-task-content">
                                <div className="mini-task-title">Drafting session Ch. 4</div>
                                <div className="mini-task-sub">14:00 - 16:00</div>
                            </div>
                        </div>
                    </div>

                    <div className="consistency-section">
                        <div className="consistency-label">CONSISTENCY</div>
                        <div className="consistency-dots">
                            <span className="c-dot active"></span>
                            <span className="c-dot active"></span>
                            <span className="c-dot active"></span>
                            <span className="c-dot"></span>
                            <span className="c-dot active"></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="system-footer-strip">
                <div className="sys-left">
                    <span className="status-indicator"></span> SYSTEM OPERATIONAL
                    <span className="sys-divider"></span>
                    DISK: 2.4 GB / 50 GB
                </div>
                <div className="sys-right">
                    V5.0-NANO // MINIMAL MODE
                </div>
            </div>
        </div>
    );
};

export default MeetingsView;
