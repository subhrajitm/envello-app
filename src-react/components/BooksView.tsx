

import React, { useState } from 'react';
import './BooksView.css';

interface Book {
    id: string;
    title: string;
    author: string;
    category: 'DESIGN' | 'CREATIVE' | 'PRODUCTIVITY';
    lastAccessed: string;
    progress: number;
    notes: number;
    status: 'VERIFIED' | 'QUEUED';
    coverImage?: string; // Optional for list, used in featured
}

const BooksView: React.FC = () => {
    const [books] = useState<Book[]>([
        {
            id: '1',
            title: 'The Design of Everyday Things',
            author: 'Don Norman',
            category: 'DESIGN',
            lastAccessed: 'Oct 24, 2023 14:20',
            progress: 45,
            notes: 14,
            status: 'VERIFIED'
        },
        {
            id: '2',
            title: 'Story: Substance, Structure',
            author: 'Robert McKee',
            category: 'CREATIVE',
            lastAccessed: 'Oct 22, 2023 09:15',
            progress: 12,
            notes: 3,
            status: 'QUEUED'
        },
        {
            id: '3',
            title: 'Atomic Habits',
            author: 'James Clear',
            category: 'PRODUCTIVITY',
            lastAccessed: 'Oct 20, 2023 18:44',
            progress: 94,
            notes: 86,
            status: 'VERIFIED'
        },
    ]);

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'DESIGN': return 'badge-blue';
            case 'CREATIVE': return 'badge-purple';
            case 'PRODUCTIVITY': return 'badge-orange';
            default: return 'badge-gray';
        }
    };

    return (
        <div className="books-view-ent">
            {/* Main Content Area */}
            <div className="books-main-area">
                {/* Header Bar */}
                <div className="books-ent-header">
                    <div className="header-title-block">
                        <h1 className="ent-header-title">PRIMARY LIBRARY HUB</h1>
                        <div className="ent-header-meta">Managing 1,428 enterprise assets</div>
                    </div>
                    <div className="header-status-pills">
                        <div className="status-pill active-pill">
                            <span className="dot-indicator"></span> ACTIVE: 08
                        </div>
                        <div className="status-pill">
                            <span className="dot-indicator green"></span> ANNOTATED: 1,284
                        </div>
                    </div>
                    <div className="view-toggles">
                        <button className="toggle-btn active"><span className="material-symbols-outlined">view_list</span></button>
                        <button className="toggle-btn"><span className="material-symbols-outlined">grid_view</span></button>
                    </div>
                </div>

                {/* Table List */}
                <div className="books-list-container">
                    <div className="ent-table-header">
                        <div className="col-icon"></div>
                        <div className="col-title">ASSET TITLE / AUTHOR</div>
                        <div className="col-category">CATEGORY</div>
                        <div className="col-date">LAST ACCESSED</div>
                        <div className="col-progress">PROGRESS</div>
                        <div className="col-notes">ANNOTATIONS</div>
                        <div className="col-status">AI STATUS</div>
                        <div className="col-actions">ACTIONS</div>
                    </div>
                    <div className="ent-table-body">
                        {books.map(book => (
                            <div key={book.id} className="ent-table-row">
                                <div className="col-icon">
                                    <span className="material-symbols-outlined book-icon">book</span>
                                </div>
                                <div className="col-title">
                                    <div className="row-title">{book.title}</div>
                                    <div className="row-author">{book.author}</div>
                                </div>
                                <div className="col-category">
                                    <span className={`cat-badge ${getCategoryColor(book.category)}`}>
                                        {book.category}
                                    </span>
                                </div>
                                <div className="col-date">{book.lastAccessed}</div>
                                <div className="col-progress">
                                    <div className="progress-bar-ent">
                                        <div className="prog-fill" style={{ width: `${book.progress}%` }}></div>
                                    </div>
                                </div>
                                <div className="col-notes">
                                    <span className="notes-val">{book.notes.toString().padStart(2, '0')} Notes</span>
                                </div>
                                <div className="col-status">
                                    <span className={`status-indicator ${book.status === 'VERIFIED' ? 'st-verified' : 'st-queued'}`}>
                                        <span className="material-symbols-outlined st-icon">
                                            {book.status === 'VERIFIED' ? 'check_circle' : 'pending'}
                                        </span>
                                        {book.status}
                                    </span>
                                </div>
                                <div className="col-actions">
                                    <span className="material-symbols-outlined">more_horiz</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Featured Deep Dive Section */}
                <div className="featured-section">
                    <div className="feat-image-placeholder">
                        <div className="placeholder-book-spine"></div>
                        {/* In a real app this would be an image tag */}
                        <div className="placeholder-text">The Design of Everyday Things</div>
                    </div>
                    <div className="feat-content">
                        <div className="feat-header-row">
                            <span className="feat-badge">CURRENT DEEP DIVE</span>
                            <span className="feat-meta">UPDATED 2H AGO</span>
                        </div>
                        <h2 className="feat-title">The Design of Everyday Things</h2>
                        <h3 className="feat-subtitle">Revised and Expanded Edition</h3>

                        <div className="ai-insight-box">
                            <div className="ai-insight-header">
                                <span className="material-symbols-outlined ai-star">auto_awesome</span>
                                AI SYNTHESIS: CRITICAL INSIGHTS
                            </div>
                            <div className="insights-grid">
                                <div className="insight-card">
                                    <div className="in-title">Affordances</div>
                                    <div className="in-desc">Properties of objects that determine how they could possibly be used. Mental models built on past experiences.</div>
                                </div>
                                <div className="insight-card">
                                    <div className="in-title">Signifiers</div>
                                    <div className="in-desc">The signaling component of affordances. Clear visual cues that communicate where an action takes place.</div>
                                </div>
                                <div className="insight-card">
                                    <div className="in-title">Gulf of Execution</div>
                                    <div className="in-desc">The distance between human goal and physical system. Bridges needed for intuitive interface navigation.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="books-sidebar">
                <div className="sidebar-section">
                    <div className="side-header">GLOBAL INSIGHTS</div>
                    <div className="insight-stat-card">
                        <div className="stat-row-top">
                            <span className="stat-label">Total Reading Time</span>
                            <span className="material-symbols-outlined stat-icon-mini">schedule</span>
                        </div>
                        <div className="stat-main-val">428h <span className="stat-growth">+12%</span></div>
                        <div className="stat-progress-line">
                            <div className="p-line-fill" style={{ width: '60%' }}></div>
                        </div>
                    </div>

                    <div className="insight-stat-card">
                        <div className="stat-row-top">
                            <span className="stat-label">Avg. Velocity</span>
                            <span className="material-symbols-outlined stat-icon-mini">bolt</span>
                        </div>
                        <div className="stat-main-val">1.4 <span className="stat-sub">BOOKS/WEEK</span></div>
                    </div>
                </div>

                <div className="sidebar-section">
                    <div className="side-header">TOP SUBJECTS</div>
                    <div className="subject-list">
                        <div className="subject-item">
                            <div className="sub-row">
                                <span>Cognitive Science</span>
                                <span>28%</span>
                            </div>
                            <div className="sub-bar"><div className="sub-fill" style={{ width: '28%' }}></div></div>
                        </div>
                        <div className="subject-item">
                            <div className="sub-row">
                                <span>Narrative Theory</span>
                                <span>22%</span>
                            </div>
                            <div className="sub-bar"><div className="sub-fill" style={{ width: '22%', background: '#a855f7' }}></div></div>
                        </div>
                        <div className="subject-item">
                            <div className="sub-row">
                                <span>Behavioral Economics</span>
                                <span>19%</span>
                            </div>
                            <div className="sub-bar"><div className="sub-fill" style={{ width: '19%', background: '#f97316' }}></div></div>
                        </div>
                    </div>
                </div>

                <div className="sidebar-section mt-auto">
                    <div className="writing-assistant-card">
                        <div className="wa-title">WRITING ASSISTANT</div>
                        <div className="wa-desc">Based on your recent annotations, I've generated 4 new connections for your manuscript.</div>
                        <button className="wa-btn">VIEW CONNECTIONS</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BooksView;
