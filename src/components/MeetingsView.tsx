import React, { useState } from 'react';
import './MeetingsView.css';

interface Meeting {
    id: string;
    title: string;
    project: string;
    month: string;
    day: string;
    time: string;
    period: 'AM' | 'PM';
    attendees: Array<{ name: string; avatar?: string }>;
    actionItems: number;
    status: 'open' | 'complete';
    color: string;
}

const MeetingsView: React.FC = () => {
    const [selectedProject, setSelectedProject] = useState('All Projects');
    const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 Days');
    const [sortBy, setSortBy] = useState('Recent First');

    const meetings: Meeting[] = [
        {
            id: '1',
            title: 'Agent Sync: Quarterly Review',
            project: 'Neon Orchard Chronicles',
            month: 'Nov',
            day: '12,',
            time: '10:00',
            period: 'AM',
            attendees: [
                { name: 'User 1', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBshAUhVwVYKH81jgOo3cSGYQ_03DK0vuUnPQRITWWOWer3u8KH7UyBLt54X4k4q22py2yS1R6Yvb2Hv0EOlUke0QBsXv-_vyaGANjV44gsMbwE0CBc3DnOTLuXl3Q-hG0DDpwvvwtQmTNBi1w5t0p8for1h6R9dxLm_MIGl-wZY6zx-57MqzYatU70ArayMd8OC-A8f8Rz9bJDe_7coc5sHD141iEvUys7ecDE14M_JswlCtpbZbN6oB2mBKoqgOQxj9SaQu3RA5-U' },
                { name: 'User 2', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV-e0vzaU8OnVjvi1c8je-Ulg79-URafS8W73HwjyD8qz9FuZDp2_kfk62ayt6UA6YPEQFXxLLRpWZnuQIyZgrgBmv0WnuBzwcVurJX08LI0qL95p4I8W-pNCRA4jWVjrZ1t9llgq52BJ8l5RNh0hQy_CEYBTnydt1cUPYtdAe-l4TWz9FZW_vLHImmjj4KnM1U2wzqE0BumUeCioAeQhpdsyNHzd4qlhZ5Mad2tUQq6OXpL2bVcE1TuB73Xc2mUQf0iSH-knDjukG' },
                { name: 'User 3', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSkgMxJq7v06z31vv_d5-FZJvsBZUHEDG9EzciuEH91iF1_HWd0zN2dRCq0vThU3uHq9zSN_PM4QLzPpupJKXy9_lvhMeIIMncyd3Uye6etOu5KJiGi_J0YB93iCEPRp0Zz5J1c0B78Cd_9tub57KdXPka9o9NKNm7Eyk0M-Ich95TilOLe1eaGtjnZ9XHPm-S0fJyQyRVA--4a0GO1WOTYj_SzhG70YFMHuX4T75vPBWbNYw6aGQonGpZe3w2mK0S9mvg9LMjr1IS' },
                { name: '+2', avatar: '' }
            ],
            actionItems: 4,
            status: 'open',
            color: '#E8D55A'
        },
        {
            id: '2',
            title: 'Worldbuilding Workshop',
            project: 'Project Alpha',
            month: 'Nov',
            day: '10,',
            time: '02:30',
            period: 'PM',
            attendees: [
                { name: 'User 4', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmY1FcHM_75uao_XhmRPmF-Gklc9_QZUHQW36c2mN4OSF-QQiAyZHO50KgBDfssgrutG_L6e6siyAt-glKOsGoxIhes2ugdspfx_oTHFmLsgP2sPmi5En5uQ5jLrXG6sWdc-fWDfnvoJwytTmkcWDgHuIw3BVOCmpr6HU0T4HTsgzx3a4v0XYYpAcIIlf6YVOPRDp6P6mJNWOu0nehVYqPxedrpKvF-atGJScrb5GAcOQlO4ysfoTedimw2my6wknzO1hxoP5K7IfH' },
                { name: 'User 5', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5bwBoFq2vASkLUfPSUXUewuFrCl8iphiIqA-MWuyRRnpwUjz83zlHfox_QvsvRbLst9sLMQ9x7Z2uGGu-wZyX_1sRF16AMBO_XwW74GSRcTSqhGikFHTbW2h_tf0hjD2sgXxjAz0200odqSpdyvkvGW5R8igE0aAB1NqqQyAU-mVjLpxOEZc4twOnh8x5MpX_z5NbysbwXfLmpvaWkIHUJoi_bKiAAmvI_g6VHRWmwHgoho2XCvrIIWTYzbMQ7j5UzpCkvJ8tDtwJ' }
            ],
            actionItems: 2,
            status: 'open',
            color: '#3B82F6'
        },
        {
            id: '3',
            title: 'Editorial Feedback Session',
            project: 'The Scent of Green',
            month: 'Nov',
            day: '08,',
            time: '09:15',
            period: 'AM',
            attendees: [
                { name: 'User 6', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAopkW8tWTy_LepOvR9vwSVvSYlaWpfhTulaGYeBG5a8vREvZ-j4EmF2xLOMKjHpa2OeWv2n1RV2KDUgbrkHuSF5Jg9iaktjd52T0mzruQJ6tRSBJ7f8mtWfxJUaXEkWdvD_oTdO7NbrbgtMPpbPmy4-WkLZByKjdt4Phrpnm_99ESzO7rFPKSagl3vWMZ5nWNU17kCLfYzYyF8mLRAx0sxXTdSrirFxPLAv6y0Y2VwhneNOVkWeSiaioaFKdMfPIlr5TjG9tmuJnc' },
                { name: 'User 7', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtq6Uh1_arZuIO6y7E9-DEmV5B4ZiB68-5_yw-Ts5x9IsaXOyLE_HIw8WGqnJGCrg8EvEmJl_MSvS7nYMWpfbrKrnLDogQ1LJcOHVgoWfkz6A063wQQ-oYmEC1MXwP1FT0GxXbxp58fGPy_v4vSpNcVJ7roHDKy90jVa2LXk3ZA1-meqQWGPWGgH3o0BedFH0xCxhFuHrzoWxTaGDbmK8mw_2ptPrTKpaEuPuA5VSu8pFw209Uw0gO3E9ErERA6f5QpHF1tfxD25R_' },
                { name: 'User 8', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBt_6vO4woNQjkvVX2WaOXDrBLZAdj27mViNtQIn_rJJtGII5GPMRxiJhs1xKk6LY7NsttWUOQQwJ4B118XI7QA9KIEp0vH5i9ZVTuZ0VtpPPf4zHDXuNfAHMEG7yCqp9DmovgNDXA_cuRKXdbyrKfQoEyLIZjkDndLLayyRAZKrNwdkE-TW5KasM8rBHqJOoslOPp3tw_KeNLlFltA_PIwyJEj2-gL2TP1ESRLfJtK0uwlbQqY5ZL5IH2L0f3O69IjXNyI3uiKlBen' }
            ],
            actionItems: 0,
            status: 'complete',
            color: '#10B981'
        },
        {
            id: '4',
            title: 'Plot Hole Triage',
            project: 'Echoes of the Void',
            month: 'Nov',
            day: '05,',
            time: '11:00',
            period: 'AM',
            attendees: [
                { name: 'User 9', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCB-FU_FjpRVd4taX1MJNuIIUYHel8yOYTd5uaKFRpFuNQjzfJ3aSLjqzmXRgA-n-Ld_BjPqoj56Mp-tlXfrzA0J9misg2pikkWWi-QulRTUGTgwkJwM8q_L4jG1T2kD1V9tryZtZ_x5EO2WbKZwA0dgA7hWDnByAX8XY5lZhIgYaCO_g_vblUDYpsNiL0chaKKMQ3sp1ObWRo4gM1M6fG5hzI6934c_a2aiDsMnH719ienmdab1KZa9j7ZC4GijJ25U-V-0YQUR9h' }
            ],
            actionItems: 7,
            status: 'open',
            color: '#F97316'
        }
    ];

    const upcomingSyncs = [
        {
            time: 'Today, 4:00 PM',
            title: 'Marketing Strategy',
            link: 'Join Zoom',
            isToday: true
        },
        {
            time: 'Tomorrow, 11:30 AM',
            title: 'Character Arc Review',
            location: 'Room 4B / Discord',
            isToday: false
        }
    ];

    return (
        <div className="meetings-view">
            <div className="meetings-filters">
                <div className="filters-left">
                    <select 
                        className="filter-select"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                    >
                        <option>All Projects</option>
                        <option>Neon Orchard</option>
                        <option>Project Alpha</option>
                    </select>
                    <select 
                        className="filter-select"
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                    >
                        <option>Last 30 Days</option>
                        <option>Last 7 Days</option>
                        <option>This Quarter</option>
                    </select>
                </div>
                <div className="filters-right">
                    <span className="sort-label">Sort by:</span>
                    <select 
                        className="sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option>Recent First</option>
                        <option>Alphabetical</option>
                        <option>Attendees</option>
                    </select>
                </div>
            </div>

            <div className="meetings-content">
                <div className="meetings-table-container">
                    <table className="meetings-table">
                        <thead>
                            <tr>
                                <th className="col-title">Meeting Title & Context</th>
                                <th className="col-date">Date</th>
                                <th className="col-attendees">Attendees</th>
                                <th className="col-action-items">Action Items</th>
                                <th className="col-icon"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {meetings.map((meeting) => (
                                <tr key={meeting.id} className="table-row">
                                    <td className="col-title">
                                        <div className="meeting-title-cell">
                                            <div className="meeting-title-row">
                                                <span 
                                                    className="meeting-dot" 
                                                    style={{ backgroundColor: meeting.color }}
                                                ></span>
                                                <span className="meeting-title">{meeting.title}</span>
                                            </div>
                                            <span className="meeting-project">Project: {meeting.project}</span>
                                        </div>
                                    </td>
                                    <td className="col-date">
                                        <span className="meeting-date">{meeting.month} {meeting.day} {meeting.time} {meeting.period}</span>
                                    </td>
                                    <td className="col-attendees">
                                        <div className="attendees-list">
                                            {meeting.attendees.map((attendee, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="attendee-avatar"
                                                    style={attendee.avatar ? {
                                                        backgroundImage: `url(${attendee.avatar})`
                                                    } : {}}
                                                >
                                                    {!attendee.avatar && (
                                                        <span className="attendee-count">{attendee.name}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="col-action-items">
                                        {meeting.status === 'open' ? (
                                            <button className="action-items-btn">
                                                {meeting.actionItems} OPEN
                                            </button>
                                        ) : (
                                            <span className="action-items-complete">Complete</span>
                                        )}
                                    </td>
                                    <td className="col-icon">
                                        <span className="material-symbols-outlined icon-desc">description</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <aside className="meetings-sidebar">
                    <div className="sidebar-section">
                        <div className="sidebar-header">
                            <h2 className="sidebar-title">Upcoming Syncs</h2>
                            <span className="sidebar-badge">CALENDAR</span>
                        </div>
                        <div className="upcoming-syncs">
                            {upcomingSyncs.map((sync, idx) => (
                                <div 
                                    key={idx}
                                    className={`sync-item ${sync.isToday ? 'sync-today' : ''}`}
                                >
                                    <div className="sync-time">{sync.time}</div>
                                    <div className="sync-title">{sync.title}</div>
                                    {sync.link ? (
                                        <div className="sync-link">
                                            <span className="material-symbols-outlined icon-link">link</span>
                                            {sync.link}
                                        </div>
                                    ) : (
                                        <div className="sync-location">{sync.location}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="sidebar-section sidebar-metrics">
                        <h3 className="metrics-title">Project PM Overview</h3>
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <div className="metric-label-small">Avg. Velocity</div>
                                <div className="metric-value-large">
                                    2.4k<span className="metric-unit">w/d</span>
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label-small">Deadlines</div>
                                <div className="metric-value-large metric-primary">02</div>
                            </div>
                            <div className="metric-card metric-card-wide">
                                <div className="metric-header">
                                    <div className="metric-label-small">Active Action Items</div>
                                    <div className="metric-count">15/42</div>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: '35.7%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default MeetingsView;
