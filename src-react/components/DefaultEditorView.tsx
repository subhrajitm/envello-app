import React, { useState } from 'react';
import './DefaultEditorView.css';

interface DefaultEditorProps {
    title?: string;
    type?: string;
    onBack: () => void;
}

const DefaultEditorView: React.FC<DefaultEditorProps> = ({ title = 'Untitled Document', type = 'Document', onBack }) => {
    const [docTitle, setDocTitle] = useState(title);
    const [content, setContent] = useState('Start writing your masterpiece...');
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    return (
        <div className="de-layout">
            {/* Main Workspace split */}
            <div className="de-workspace">

                {/* LEFT SIDEBAR: Navigation & Outline */}
                <div className="de-sidebar-left">
                    <div className="de-sidebar-header">
                        <button className="de-btn-back" onClick={onBack}>
                            <span className="material-symbols-outlined icon-sm">arrow_back</span>
                            Back
                        </button>
                    </div>

                    <div className="de-nav-section">
                        <div className="de-nav-label">NAVIGATION</div>
                        <div className="de-nav-item active">
                            <span className="material-symbols-outlined icon-xs">article</span>
                            Editor
                        </div>
                        <div className="de-nav-item">
                            <span className="material-symbols-outlined icon-xs">toc</span>
                            Outline
                        </div>
                        <div className="de-nav-item">
                            <span className="material-symbols-outlined icon-xs">history</span>
                            Version History
                        </div>
                    </div>

                    <div className="de-nav-section mt-4">
                        <div className="de-nav-label">FILES</div>
                        <div className="de-file-tree">
                            <div className="de-file-item active">
                                <span className="material-symbols-outlined icon-xs">description</span>
                                {docTitle}
                            </div>
                            <div className="de-file-item">
                                <span className="material-symbols-outlined icon-xs">image</span>
                                Assets
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER: Editor Canvas */}
                <div className="de-main-area">
                    {/* Top Bar for Context & Actions */}
                    <div className="de-topbar">
                        <div className="de-breadcrumbs">
                            <span className="crumb">Workspace</span>
                            <span className="crumb-sep">/</span>
                            <span className="crumb">{type}s</span>
                            <span className="crumb-sep">/</span>
                            <span className="crumb active">{docTitle}</span>
                        </div>
                        <div className="de-top-actions">
                            <span className="de-save-status">Saved just now</span>
                            <button className="de-btn-share">
                                <span className="material-symbols-outlined icon-xs">share</span>
                                Share
                            </button>
                            <button className="de-btn-icon">
                                <span className="material-symbols-outlined icon-sm">more_horiz</span>
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="de-toolbar-container">
                        <div className="de-toolbar-group">
                            <button className="de-tool-btn" title="Undo"><span className="material-symbols-outlined">undo</span></button>
                            <button className="de-tool-btn" title="Redo"><span className="material-symbols-outlined">redo</span></button>
                        </div>
                        <div className="de-tool-sep"></div>
                        <div className="de-toolbar-group">
                            <select className="de-tool-select">
                                <option>Normal Text</option>
                                <option>Heading 1</option>
                                <option>Heading 2</option>
                                <option>Heading 3</option>
                            </select>
                        </div>
                        <div className="de-tool-sep"></div>
                        <div className="de-toolbar-group">
                            <button className="de-tool-btn" title="Bold"><span className="material-symbols-outlined">format_bold</span></button>
                            <button className="de-tool-btn" title="Italic"><span className="material-symbols-outlined">format_italic</span></button>
                            <button className="de-tool-btn" title="Underline"><span className="material-symbols-outlined">format_underlined</span></button>
                        </div>
                        <div className="de-tool-sep"></div>
                        <div className="de-toolbar-group">
                            <button className="de-tool-btn" title="List"><span className="material-symbols-outlined">format_list_bulleted</span></button>
                            <button className="de-tool-btn" title="Checklist"><span className="material-symbols-outlined">checklist</span></button>
                            <button className="de-tool-btn" title="Quote"><span className="material-symbols-outlined">format_quote</span></button>
                        </div>
                        <div className="de-spacer"></div>
                        <div className="de-toolbar-group">
                            <button className={`de-tab-btn ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>Write</button>
                            <button className={`de-tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="de-content-scroll">
                        <div className="de-paper">
                            <input
                                type="text"
                                className="de-title-input"
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                placeholder="Untitled"
                            />

                            {activeTab === 'edit' ? (
                                <textarea
                                    className="de-editor-textarea"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Type '/' for commands..."
                                />
                            ) : (
                                <div className="de-preview-mode">
                                    {content}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR: Properties */}
                <div className="de-sidebar-right">
                    <div className="de-sidebar-header">PROPERTIES</div>

                    <div className="de-prop-group">
                        <div className="de-prop-label">Status</div>
                        <select className="de-prop-select status-active">
                            <option>In Progress</option>
                            <option>Review</option>
                            <option>Done</option>
                        </select>
                    </div>

                    <div className="de-prop-group">
                        <div className="de-prop-label">Assignee</div>
                        <div className="de-user-row">
                            <div className="de-avatar">SM</div>
                            <span>Subhrajit M.</span>
                        </div>
                    </div>

                    <div className="de-prop-group">
                        <div className="de-prop-label">Due Date</div>
                        <div className="de-date-display">
                            <span className="material-symbols-outlined icon-xs">calendar_today</span>
                            Oct 24, 2024
                        </div>
                    </div>

                    <div className="de-sidebar-header mt-4">TAGS</div>
                    <div className="de-tags-container">
                        <span className="de-tag">#architecture</span>
                        <span className="de-tag">#2024</span>
                        <span className="de-tag-add">+ Add</span>
                    </div>

                    <div className="de-sidebar-header mt-4">STATS</div>
                    <div className="de-stats-grid">
                        <div className="de-stat-item">
                            <span className="val">2.4k</span>
                            <span className="lbl">Words</span>
                        </div>
                        <div className="de-stat-item">
                            <span className="val">12m</span>
                            <span className="lbl">Read Time</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DefaultEditorView;
