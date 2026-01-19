import React, { useState } from 'react';
import './JournalsView.css';

interface JournalProject {
    id: string;
    title: string;
    entriesCount: number;
    active: boolean;
}

interface KanbanCard {
    id: string;
    type: 'CONCEPT' | 'CHAPTER' | 'SETTING' | 'CRITICAL';
    title: string;
    desc?: string;
    meta?: string; // e.g. "Chapter 3" or "Updated 1h ago"
    updatedTime: string;
    hasAi?: boolean;
    isAiEdited?: boolean;
    progress?: number;
    statusColor?: string; // Color dot for some cards
    tags?: string[];
}

const JournalsView: React.FC = () => {
    const [projects] = useState<JournalProject[]>([
        { id: '1', title: '2024 Morning Pages', entriesCount: 142, active: true },
        { id: '2', title: 'Plot Ideas Log', entriesCount: 86, active: false },
        { id: '3', title: 'Character Dev - SciFi', entriesCount: 54, active: false },
        { id: '4', title: 'Dream Journal 2023', entriesCount: 312, active: false },
        { id: '5', title: 'World Building Notes', entriesCount: 24, active: false },
        { id: '6', title: 'Travel Reflections', entriesCount: 18, active: false },
    ]);

    const ideasCards: KanbanCard[] = [
        {
            id: 'i1', type: 'CONCEPT', title: 'Neon Noir Protagonist',
            desc: 'Initial sketches for the cybernetic detective character in Chapter 3.',
            updatedTime: 'Updated 1h ago', hasAi: true
        },
        {
            id: 'i2', type: 'SETTING', title: 'Underground Bazaar',
            desc: 'The sensory details of the black market in Neo-Tokyo district.',
            updatedTime: 'Updated 3h ago', statusColor: '#4ade80' // Green smiley equivalent
        }
    ];

    const draftingCards: KanbanCard[] = [
        {
            id: 'd1', type: 'CHAPTER', title: 'The Rain Never Stops',
            meta: '2,450 words', updatedTime: 'Active',
            progress: 70
        }
    ];

    const reviewCards: KanbanCard[] = [
        {
            id: 'r1', type: 'CRITICAL', title: 'Prologue Redux',
            desc: 'Tone consistency check required after AI expansion of opening scene.',
            updatedTime: 'Feedback Ready', isAiEdited: true, tags: ['Feedback Ready']
        }
    ];

    return (
        <div className="journals-layout">
            {/* Left Sidebar */}
            <div className="j-sidebar">
                <div className="j-sidebar-header">
                    JOURNALS & PROJECTS
                    <span className="material-symbols-outlined folder-icon">folder_open</span>
                </div>
                <div className="j-project-list">
                    {projects.map(p => (
                        <div key={p.id} className={`j-project-row ${p.active ? 'active' : ''}`}>
                            <span className="material-symbols-outlined icon-folder">
                                {p.active ? 'folder_open' : 'folder'}
                            </span>
                            <div className="j-proj-info">
                                <div className="j-proj-title">{p.title}</div>
                                <div className="j-proj-count">{p.entriesCount} Entries</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="j-sidebar-footer">
                    <div className="storage-label">
                        <span>STORAGE USAGE</span>
                        <span>64%</span>
                    </div>
                    <div className="storage-bar">
                        <div className="storage-fill" style={{ width: '64%' }}></div>
                    </div>
                </div>
            </div>

            {/* Main Kanban Content */}
            <div className="j-main-content">
                {/* Header */}
                <div className="j-main-header">
                    <div className="j-header-left">
                        <h1 className="j-page-title">2024 Morning Pages <span className="material-symbols-outlined lock-icon">lock</span></h1>
                        <div className="j-sub-header">PROJECT WORKFLOW BOARD</div>
                    </div>

                    <div className="j-header-stats">
                        <div className="j-stat-group">
                            <div className="stat-label">PROGRESS</div>
                            <div className="stat-val yellow">78%</div>
                        </div>
                        <div className="j-stat-divider"></div>
                        <div className="j-stat-group">
                            <div className="stat-label">TARGET</div>
                            <div className="stat-val">50,000 words</div>
                        </div>
                    </div>

                    <div className="j-header-controls">
                        <button className="j-filter-btn">FILTER BY <span>All Entries</span></button>
                        <button className="j-view-toggle">
                            <span className="material-symbols-outlined icon-sm">view_kanban</span>
                            Kanban
                        </button>
                    </div>
                </div>

                {/* Columns */}
                <div className="j-kanban-board">

                    {/* IDEAS Column */}
                    <div className="j-col">
                        <div className="j-col-header">
                            <div className="col-title-group">
                                <span className="col-dot blue"></span>
                                IDEAS <span className="col-count">12</span>
                            </div>
                            <span className="material-symbols-outlined icon-add">add</span>
                        </div>
                        <div className="j-col-body">
                            {ideasCards.map(card => (
                                <div key={card.id} className="j-card">
                                    <div className="card-top">
                                        <span className="card-tag tag-blue">{card.type}</span>
                                        <span className="material-symbols-outlined icon-more">more_horiz</span>
                                    </div>
                                    <div className="card-title">{card.title}</div>
                                    {card.desc && <div className="card-desc">{card.desc}</div>}
                                    <div className="card-footer">
                                        {card.hasAi && <span className="ai-badge-circle">AI</span>}
                                        {card.statusColor && <span className="status-emoji material-symbols-outlined">sentiment_satisfied</span>}
                                        <span className="card-time">{card.updatedTime}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DRAFTING Column */}
                    <div className="j-col">
                        <div className="j-col-header">
                            <div className="col-title-group">
                                <span className="col-dot orange"></span>
                                DRAFTING <span className="col-count">4</span>
                            </div>
                            <span className="material-symbols-outlined icon-add">add</span>
                        </div>
                        <div className="j-col-body">
                            {draftingCards.map(card => (
                                <div key={card.id} className="j-card">
                                    <div className="card-top">
                                        <span className="card-tag tag-orange">{card.type} {card.title.includes('1') ? '1' : ''}</span> {/* Mock logic for "CHAPTER 1" */}
                                        <span className="material-symbols-outlined icon-more">more_horiz</span>
                                    </div>
                                    <div className="card-title">{card.title}</div>

                                    {card.progress && (
                                        <div className="card-progress-container">
                                            <div className="card-prog-bar"><div className="prog-fill" style={{ width: `${card.progress}%` }}></div></div>
                                        </div>
                                    )}

                                    <div className="card-footer">
                                        <span className="card-meta-icon material-symbols-outlined">description</span>
                                        <span className="card-meta-text">{card.meta}</span>
                                        <span className="card-time ml-auto">{card.updatedTime}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* REVIEW Column */}
                    <div className="j-col">
                        <div className="j-col-header">
                            <div className="col-title-group">
                                <span className="col-dot purple"></span>
                                REVIEW <span className="col-count">2</span>
                            </div>
                            <span className="material-symbols-outlined icon-add">add</span>
                        </div>
                        <div className="j-col-body">
                            {reviewCards.map(card => (
                                <div key={card.id} className="j-card">
                                    <div className="card-top">
                                        <div className="flex gap-2">
                                            <span className="card-tag tag-purple">{card.type}</span>
                                            {card.isAiEdited && <span className="card-tag tag-gray">AI EDITED</span>}
                                        </div>
                                    </div>
                                    <div className="card-title mt-2">{card.title}</div>
                                    <div className="card-desc">{card.desc}</div>
                                    <div className="card-footer mt-2">
                                        <div className="tag-feedback">
                                            <span className="material-symbols-outlined icon-xs">auto_awesome</span> Feedback Ready
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Bottom Status Bar is handled by global Footer component, 
                 but specific view status "AI CORE ONLINE" is usually part of layout in these screenshots.
                 Will leave it to global footer for consistency unless requested.
             */}
        </div>
    );
};

export default JournalsView;
