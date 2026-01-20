import React, { useState } from 'react';
import './BrainstormingView.css';

interface Session {
    id: string;
    title: string;
    lastEdit: string;
    aiCount: number;
    active: boolean;
    statusColor?: string;
}

const BrainstormingView: React.FC = () => {
    const [sessions] = useState<Session[]>([
        { id: '1', title: 'Q4 Project "Phoenix"', lastEdit: '2m ago', aiCount: 142, active: false, statusColor: '#4ade80' },
        { id: '2', title: 'Global Market Pivot', lastEdit: 'Active', aiCount: 843, active: true, statusColor: '#fcd34d' },
        { id: '3', title: 'SaaS Pricing Model', lastEdit: '1h ago', aiCount: 24, active: false, statusColor: '#9ca3af' },
        { id: '4', title: 'Core Infra Expansion', lastEdit: '4h ago', aiCount: 512, active: false, statusColor: '#9ca3af' },
        { id: '5', title: 'Retention Alpha Lab', lastEdit: 'Yesterday', aiCount: 12, active: false, statusColor: '#9ca3af' },
    ]);

    return (
        <div className="brainstorming-layout">
            {/* Left Sidebar */}
            <div className="bs-sidebar">
                <div className="bs-sidebar-header">
                    <span className="bs-sidebar-title">ACTIVE BRAINSTORMING SESSIONS</span>
                    <div className="bs-header-actions">
                        <span className="material-symbols-outlined icon-btn-xs">swap_vert</span>
                        <span className="material-symbols-outlined icon-btn-xs">filter_list</span>
                    </div>
                </div>

                <div className="bs-session-list">
                    <div className="list-header-row">
                        <span className="col-1">TITLE</span>
                        <span className="col-2">LAST EDIT</span>
                        <span className="col-3">AI<br />CONCEPT</span>
                    </div>
                    {sessions.map(session => (
                        <div key={session.id} className={`session-row ${session.active ? 'active' : ''}`}>
                            <div className="col-1 title-col">
                                <span className="status-dot" style={{ backgroundColor: session.statusColor }}></span>
                                {session.title}
                            </div>
                            <div className="col-2">{session.lastEdit}</div>
                            <div className="col-3 text-right">{session.aiCount}</div>
                        </div>
                    ))}
                </div>

                <div className="bs-sidebar-footer">
                    <button className="new-session-btn">
                        <span className="material-symbols-outlined">add</span>
                        NEW STRATEGY SESSION
                    </button>
                    <div className="system-status-bar">
                        <div className="status-item">
                            <span className="status-dot-xs green"></span> CLOUD SYNC: OPERATIONAL
                        </div>
                        <div className="status-item">
                            <span className="status-icon-xs">Ai</span> AI ENGINE: ENTERPRISE V2
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="bs-canvas-area">
                <div className="canvas-header-overlay">
                    <h1 className="canvas-title">Strategic Idea Board</h1>
                    <span className="workspace-badge">INFINITE WORKSPACE</span>
                </div>

                {/* Nodes Container - Absolute Positioning Simulation */}
                <div className="nodes-container">

                    {/* Master Concept Node */}
                    <div className="node-card master-node" style={{ top: '45%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <div className="node-header">
                            <span className="node-label">MASTER CONCEPT</span>
                            <span className="material-symbols-outlined verified-icon">verified</span>
                        </div>
                        <div className="node-title">Global Market Pivot 2024</div>
                        <div className="node-desc">Transitioning from regional hubs to a unified decentralized infrastructure for global compliance.</div>
                        <div className="node-footer">
                            <div className="node-dots">
                                <span className="dot green"></span>
                                <span className="dot gray"></span>
                            </div>
                        </div>

                        {/* Connection Lines (Simulated with absolute divs for now) */}
                        <div className="connection-line line-right-top"></div>
                        <div className="connection-line line-right-bottom"></div>
                    </div>

                    {/* Growth Vector Node */}
                    <div className="node-card sub-node" style={{ top: '30%', left: '75%' }}>
                        <div className="node-header sub-head">
                            <span className="node-label">GROWTH VECTOR</span>
                            <span className="ai-indicator">AI <span className="material-symbols-outlined bolt-icon">bolt</span></span>
                        </div>
                        <div className="node-title-sm">APAC Integration</div>
                        <div className="node-desc-sm">Deploying Tier-1 edge nodes in Singapore and Tokyo for &lt; 15ms latency.</div>
                    </div>

                    {/* Infra Layer Node */}
                    <div className="node-card sub-node" style={{ top: '60%', left: '75%' }}>
                        <div className="node-header sub-head">
                            <span className="node-label">INFRA LAYER</span>
                            <span className="ai-indicator">AI <span className="material-symbols-outlined stars-icon">auto_awesome</span></span>
                        </div>
                        <div className="node-title-sm">Decentralized Auth</div>
                        <div className="node-desc-sm">Zero-trust architecture utilizing biometric verification on the edge.</div>
                    </div>

                </div>

                {/* Right Floating Toolbar */}
                <div className="floating-toolbar-right">
                    <button className="float-btn active"><span className="material-symbols-outlined">bolt</span></button>
                    <button className="float-btn"><span className="material-symbols-outlined">add_box</span></button>
                    <button className="float-btn"><span className="material-symbols-outlined">share</span></button>
                    <button className="float-btn"><span className="material-symbols-outlined">title</span></button>
                    <button className="float-btn"><span className="material-symbols-outlined">upload_file</span></button>
                    <div className="float-divider"></div>
                    <button className="float-btn"><span className="material-symbols-outlined">settings</span></button>
                </div>

                {/* Bottom Left Controls */}
                <div className="bottom-controls">
                    <button className="control-btn"><span className="material-symbols-outlined">zoom_in</span></button>
                    <button className="control-btn"><span className="material-symbols-outlined">zoom_out</span></button>
                    <span className="zoom-val">100%</span>
                    <button className="control-btn"><span className="material-symbols-outlined">center_focus_strong</span></button>
                </div>

                {/* Footer Info */}
                <div className="canvas-footer-info">
                    <span className="footer-loc">LOC: 34.021 / -118.243</span>
                    <span className="footer-sep">|</span>
                    <span className="footer-restricted">INTERNAL USE ONLY — NANO BANANA CORP</span>
                </div>
            </div>
        </div>
    );
};

export default BrainstormingView;
