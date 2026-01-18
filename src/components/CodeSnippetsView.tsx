import React from 'react';
import './CodeSnippetsView.css';

const CodeSnippetsView: React.FC = () => {
    const snippets = [
        { title: 'React Hook: useDebounce', lang: 'TYPESCRIPT', tags: ['React', 'Utils'] },
        { title: 'CSS Grid Layout Scaffold', lang: 'CSS', tags: ['Layout', 'UI'] },
        { title: 'Python Data Scraper', lang: 'PYTHON', tags: ['Backend', 'Script'] },
        { title: 'Docker Compose Setup', lang: 'YAML', tags: ['DevOps'] }
    ];

    return (
        <div className="code-view">
            <div className="code-sidebar">
                <div className="sidebar-group">
                    <div className="group-header">LANGUAGES</div>
                    <div className="group-item active">All Snippets</div>
                    <div className="group-item">TypeScript</div>
                    <div className="group-item">Python</div>
                    <div className="group-item">CSS</div>
                </div>
            </div>
            <div className="code-main">
                <div className="code-grid">
                    {snippets.map((snip, i) => (
                        <div key={i} className="snippet-card">
                            <div className="snippet-header">
                                <span className="lang-badge">{snip.lang}</span>
                                <div className="snippet-actions">
                                    <span className="material-symbols-outlined icon-btn">content_copy</span>
                                </div>
                            </div>
                            <div className="snippet-title">{snip.title}</div>
                            <div className="snippet-tags">
                                {snip.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                            </div>
                            <div className="code-preview">
                                <div className="line"></div>
                                <div className="line short"></div>
                                <div className="line"></div>
                            </div>
                        </div>
                    ))}
                    <div className="snippet-card add-new">
                        <span className="material-symbols-outlined">add</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodeSnippetsView;
