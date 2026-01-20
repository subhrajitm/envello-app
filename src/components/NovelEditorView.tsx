import React, { useState } from 'react';
import './NovelEditorView.css';

interface NovelEditorProps {
    novelId: string;
    onBack: () => void;
}

const NovelEditorView: React.FC<NovelEditorProps> = ({ novelId, onBack }) => {
    const [wordCount, setWordCount] = useState(1240);
    const [activeChapter, setActiveChapter] = useState('01');
    const [activeRightTab, setActiveRightTab] = useState('AI');

    return (
        <div className="ne-layout">
            <div className="ne-workspace">
                {/* Left Sidebar: Navigation */}
                <div className="ne-sidebar-left">
                    <div className="ne-sidebar-header-action">
                        <button className="ne-btn-back-sidebar" onClick={onBack}>
                            <span className="material-symbols-outlined">arrow_back</span>
                            Back to Projects
                        </button>
                    </div>



                    <div className="ne-chapters-section">
                        <div className="ne-chap-header">
                            CHAPTERS <span className="material-symbols-outlined icon-add">add</span>
                        </div>
                        <div className="ne-chapter-list">
                            <div className={`ne-chapter-item ${activeChapter === '01' ? 'active' : ''}`} onClick={() => setActiveChapter('01')}>
                                <div className="ne-chap-title">01. The First Peel</div>
                                <div className="ne-chap-meta">1,240 words</div>
                            </div>
                            <div className={`ne-chapter-item ${activeChapter === '02' ? 'active' : ''}`} onClick={() => setActiveChapter('02')}>
                                <div className="ne-chap-title">02. Bitter Rinds</div>
                                <div className="ne-chap-meta ne-draft-tag">DRAFT</div>
                            </div>
                            <div className={`ne-chapter-item ${activeChapter === '03' ? 'active' : ''}`} onClick={() => setActiveChapter('03')}>
                                <div className="ne-chap-title">03. Harvest Moon</div>
                                <div className="ne-chap-meta ne-empty-tag">EMPTY</div>
                            </div>
                        </div>
                    </div>

                    <div className="ne-sync-status">
                        <div className="sync-line"></div>
                        <div className="sync-info">
                            <span>Sync Status</span>
                            <span className="sync-active">Cloud Active</span>
                        </div>
                    </div>
                </div>

                {/* Center: Editor */}
                <div className="ne-editor-area">
                    <div className="ne-editor-canvas">
                        <h1 className="ne-doc-title">Chapter 1: The First Peel</h1>
                        <div className="ne-doc-meta">
                            <span className="meta-ver">DRAFT V2.4</span>
                            <span className="meta-sep">•</span>
                            <span className="meta-scene">SCENE: THE ORCHARD ENTRANCE</span>
                        </div>

                        <div className="ne-editor-text">
                            <p>The sun hung low over the horizon, casting long, golden shadows across the orchard. Arthur adjusted his spectacles, the weight of the manuscript heavy in his satchel. It was time. He had waited three years for this moment, but as he stood before the heavy oak doors, his resolve wavered. The wind whispered secrets through the leaves, a soft rustle that sounded almost like a warning.</p>

                            <p>He stepped forward, the gravel crunching beneath his boots. Every step felt like a mile, every breath a triumph. Behind him, the world he knew was fading; ahead, a story yet to be written. The AI pulse in his pocket vibrated—a gentle reminder that he wasn't alone in this creative endeavor.</p>

                            <blockquote className="ne-quote-block">
                                "You should go inside now," a small voice echoed in his mind, or perhaps it was the device. Arthur looked up. The lights in the upper window of the manor flickered once, then twice, mimicking the rhythmic beat of a mechanical heart. He took a deep breath, the scent of overripe fruit filling his lungs, and reached for the iron knocker.
                            </blockquote>

                            <p>The door didn't wait for him to strike. It creaked open, just a sliver, revealing a darkness that seemed more intentional than accidental. "Is anyone there?" Arthur's voice sounded thin, frail against the vast silence of the orchard. No answer came, only the smell of old paper and ozone—the signature scent of the Banana Conservatory.</p>
                        </div>

                        <div className="ne-editor-footer">
                            <span className="editor-placeholder">Continue the sequence...</span>
                            <div className="editor-stats-pill">
                                <span>WORDS <strong>{wordCount.toLocaleString()}/2,000</strong></span>
                                <span className="stat-sep">|</span>
                                <span>READING TIME <strong>5m</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Tabs & Content */}
                <div className="ne-sidebar-right">

                    {/* Tab Navigation */}
                    <div className="ne-right-tabs">
                        <button
                            className={`ne-tab-btn ${activeRightTab === 'AI' ? 'active' : ''}`}
                            onClick={() => setActiveRightTab('AI')}
                            title="Studio Intelligence"
                        >
                            <span className="material-symbols-outlined icon-tab">bolt</span>
                        </button>
                        <button
                            className={`ne-tab-btn ${activeRightTab === 'MANUSCRIPT' ? 'active' : ''}`}
                            onClick={() => setActiveRightTab('MANUSCRIPT')}
                            title="Manuscript Settings"
                        >
                            <span className="material-symbols-outlined icon-tab">menu_book</span>
                        </button>
                        <button
                            className={`ne-tab-btn ${activeRightTab === 'CHARACTERS' ? 'active' : ''}`}
                            onClick={() => setActiveRightTab('CHARACTERS')}
                            title="Characters"
                        >
                            <span className="material-symbols-outlined icon-tab">group</span>
                        </button>
                        <button
                            className={`ne-tab-btn ${activeRightTab === 'PLOT' ? 'active' : ''}`}
                            onClick={() => setActiveRightTab('PLOT')}
                            title="Plot Outliner"
                        >
                            <span className="material-symbols-outlined icon-tab">account_tree</span>
                        </button>
                        <button
                            className={`ne-tab-btn ${activeRightTab === 'WORLD' ? 'active' : ''}`}
                            onClick={() => setActiveRightTab('WORLD')}
                            title="World Codex"
                        >
                            <span className="material-symbols-outlined icon-tab">public</span>
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="ne-right-content">
                        {activeRightTab === 'AI' && (
                            <>
                                <div className="ne-ai-header">
                                    STUDIO INTELLIGENCE
                                    <div className="online-dot"></div>
                                </div>

                                <div className="ne-ai-actions">
                                    <button className="btn-ai-primary">
                                        <span className="material-symbols-outlined icon-play">play_arrow</span>
                                        Continue Scene
                                    </button>
                                    <div className="ai-btn-row">
                                        <button className="btn-ai-sec">
                                            <span className="material-symbols-outlined">auto_fix_high</span>
                                            Rewrite
                                        </button>
                                        <button className="btn-ai-sec">
                                            <span className="material-symbols-outlined">analytics</span>
                                            Analyze
                                        </button>
                                    </div>
                                </div>

                                <div className="ne-context-box">
                                    <div className="ctx-header">
                                        CONTEXT OVERRIDE
                                        <span className="material-symbols-outlined icon-info">info</span>
                                    </div>
                                    <textarea
                                        className="ctx-input"
                                        placeholder="Inject specific direction or tone instructions here..."
                                    ></textarea>
                                    <button className="btn-execute">
                                        Execute <span className="material-symbols-outlined icon-sm">keyboard_return</span>
                                    </button>
                                </div>

                                <div className="ne-suggestions-box">
                                    <div className="sugg-header">
                                        LATEST SUGGESTIONS
                                        <span className="clear-link">Clear</span>
                                    </div>
                                    <div className="sugg-card">
                                        "The iron felt colder than the surrounding frost, a chill that seeped into his marrow..."
                                    </div>
                                </div>
                            </>
                        )}

                        {activeRightTab === 'MANUSCRIPT' && (
                            <div className="ne-tab-placeholder">
                                <div className="placeholder-icon"><span className="material-symbols-outlined">menu_book</span></div>
                                <div className="placeholder-text">Manuscript Settings & Goals</div>
                            </div>
                        )}
                        {activeRightTab === 'CHARACTERS' && (
                            <div className="ne-tab-placeholder">
                                <div className="placeholder-icon"><span className="material-symbols-outlined">group</span></div>
                                <div className="placeholder-text">Character Database</div>
                            </div>
                        )}
                        {activeRightTab === 'PLOT' && (
                            <div className="ne-tab-placeholder">
                                <div className="placeholder-icon"><span className="material-symbols-outlined">account_tree</span></div>
                                <div className="placeholder-text">Plot Outline & Beats</div>
                            </div>
                        )}
                        {activeRightTab === 'WORLD' && (
                            <div className="ne-tab-placeholder">
                                <div className="placeholder-icon"><span className="material-symbols-outlined">public</span></div>
                                <div className="placeholder-text">World Codex & Lore</div>
                            </div>
                        )}
                    </div>

                    <div className="ne-ai-footer">
                        <div className="footer-action">
                            <span className="material-symbols-outlined icon-sm">visibility_off</span>
                            Focus Mode
                            <span className="sc-hint">⌘F</span>
                        </div>
                        <div className="footer-action">
                            <span className="material-symbols-outlined icon-sm">history</span>
                            Revision History
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NovelEditorView;
