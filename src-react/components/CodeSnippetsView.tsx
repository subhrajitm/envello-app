import React, { useState } from 'react';
import './CodeSnippetsView.css';
import SyntaxHighlighter from './SyntaxHighlighter';

interface Snippet {
    id: string;
    title: string;
    lang: string;
    tags: string[];
    lastModified: string;
    content: string;
    filename: string;
    path: string;
    creator: string;
}

const CodeSnippetsView: React.FC = () => {
    const [activeLang, setActiveLang] = useState('Python');
    const [selectedSnippetId, setSelectedSnippetId] = useState('1');

    const snippets: Snippet[] = [
        {
            id: '1',
            title: 'sso_auth_provider.py',
            lang: 'Python',
            tags: ['AUTH'],
            lastModified: '12m ago',
            filename: 'sso_auth_provider.py',
            path: '/infrastructure/auth/',
            creator: '@j.smith',
            content: `import boto3
from botocore.exceptions import ClientError
# AWS SSO Authentication Handler
class SSOAuthProvider:
    def __init__(self, region_name):
        self.region = region_name
        self.client = boto3.client('sso', region_name=region_name)

    def get_token(self):
        try:
            # Logic to retrieve cached token or initiate login
            return self.client.get_token()
        except ClientError as e:
            print(f"Error authenticating: {e}")
            raise`
        },
        {
            id: '2',
            title: 'data_migration_util.py',
            lang: 'Python',
            tags: ['DB'],
            lastModified: '2h ago',
            filename: 'data_migration_util.py',
            path: '/backend/utils/',
            creator: '@m.doe',
            content: `import pandas as pd
# Migration utility functions`
        },
        // ... more snippets mock if needed
    ];

    const selectedSnippet = snippets.find(s => s.id === selectedSnippetId) || snippets[0];

    return (
        <div className="cs-layout">

            {/* LEFT SIDEBAR: LANGUAGES */}
            <div className="cs-sidebar-left">
                <div className="cs-sidebar-header">LANGUAGES</div>
                <ul className="cs-lang-list">
                    <li className={`cs-lang-item ${activeLang === 'Python' ? 'active' : ''}`} onClick={() => setActiveLang('Python')}>
                        <span className="lang-dot python"></span> Python
                    </li>
                    <li className="cs-lang-item">
                        <span className="lang-dot js"></span> JavaScript
                    </li>
                    <li className="cs-lang-item">
                        <span className="lang-dot md"></span> Markdown
                    </li>
                    <li className="cs-lang-item">
                        <span className="lang-dot sql"></span> SQL
                    </li>
                    <li className="cs-lang-item">
                        <span className="lang-dot ts"></span> TypeScript
                    </li>
                    <li className="cs-lang-item">
                        <span className="lang-dot html"></span> HTML/CSS
                    </li>
                </ul>

                <div className="cs-sidebar-section mt-auto">
                    <div className="cs-sidebar-header">RECENT TAGS</div>
                    {/* Mock tags if needed, or collapsed */}
                    <span className="material-symbols-outlined expand-icon">expand_more</span>
                </div>

                <div className="cs-sidebar-footer">
                    <div className="footer-status-dot"></div>
                    <span className="footer-status-text">SYNC: UP TO DATE</span>
                </div>
            </div>

            {/* MIDDLE PANE: SNIPPET LIST */}
            <div className="cs-list-pane">
                <div className="cs-pane-header">
                    <div className="cs-header-title">
                        {activeLang} Snippets <span className="count-badge">24 items</span>
                    </div>
                    <div className="cs-header-controls">
                        <button className="cs-control-btn">Status: All <span className="material-symbols-outlined icon-xs">expand_more</span></button>
                        <button className="cs-control-btn">Sort: Last Modified</button>
                    </div>
                </div>

                <div className="cs-table-header">
                    <div className="col-title">TITLE</div>
                    <div className="col-lang">LANG</div>
                    <div className="col-tags">TAGS</div>
                    <div className="col-mod">LAST MODIFIED</div>
                </div>

                <div className="cs-snippet-list">
                    {snippets.map(snip => (
                        <div
                            key={snip.id}
                            className={`cs-snippet-row ${selectedSnippetId === snip.id ? 'selected' : ''}`}
                            onClick={() => setSelectedSnippetId(snip.id)}
                        >
                            <div className="col-title">
                                <span className="material-symbols-outlined file-icon">code</span>
                                {snip.title}
                            </div>
                            <div className="col-lang">
                                <span className="cs-badge">{snip.lang}</span>
                            </div>
                            <div className="col-tags">
                                {snip.tags.map(t => <span key={t} className="cs-tag">#{t}</span>)}
                            </div>
                            <div className="col-mod">{snip.lastModified}</div>
                        </div>
                    ))}
                </div>

                <div className="cs-list-footer">
                    <span className="material-symbols-outlined icon-xs">code</span> 1,284 SNIPPETS TOTAL
                </div>
            </div>

            {/* RIGHT PANE: PREVIEW */}
            <div className="cs-preview-pane">
                <div className="cs-pane-header preview-header">
                    <div className="cs-header-title">SNIPPET PREVIEW</div>
                    <div className="cs-preview-actions">
                        <button className="cs-action-btn primary"><span className="material-symbols-outlined icon-xs">content_copy</span> Copy</button>
                        <button className="cs-action-btn"><span className="material-symbols-outlined icon-xs">open_in_full</span></button>
                        <button className="cs-action-btn"><span className="material-symbols-outlined icon-xs">edit</span></button>
                        <button className="cs-action-btn"><span className="material-symbols-outlined icon-xs">share</span></button>
                    </div>
                </div>

                <div className="cs-preview-content">
                    <div className="preview-meta">
                        <h2 className="preview-filename">{selectedSnippet.filename}</h2>
                        <div className="preview-path">
                            <span className="path-text">{selectedSnippet.path}</span>
                            <span className="meta-sep">•</span>
                            <span className="creator-text">Created by {selectedSnippet.creator}</span>
                        </div>
                    </div>

                    <div className="code-editor-mock">
                        <div className="line-numbers">
                            {selectedSnippet.content.split('\n').map((_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </div>
                        <div className="code-content-wrapper">
                            <SyntaxHighlighter code={selectedSnippet.content} language={selectedSnippet.lang} />
                        </div>
                    </div>
                </div>

                <div className="cs-preview-footer">
                    <div className="assoc-header">ASSOCIATIONS</div>
                    <div className="assoc-chips">
                        <div className="assoc-chip">
                            <span className="material-symbols-outlined link-icon">link</span>
                            core-auth-lib
                        </div>
                    </div>
                    <div className="snippet-version-info">
                        V5.1.0-SNIPPET-HUB <span className="sep">|</span> Python 3.11
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodeSnippetsView;
