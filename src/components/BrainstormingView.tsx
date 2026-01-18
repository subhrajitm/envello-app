import React from 'react';
import './BrainstormingView.css';

const BrainstormingView: React.FC = () => {
    return (
        <div className="brainstorming-view">
            <div className="whiteboard-toolbar">
                <button className="tool-btn active"><span className="material-symbols-outlined">pan_tool</span></button>
                <button className="tool-btn"><span className="material-symbols-outlined">check_box_outline_blank</span></button>
                <button className="tool-btn"><span className="material-symbols-outlined">title</span></button>
                <button className="tool-btn"><span className="material-symbols-outlined">sticky_note_2</span></button>
                <div className="divider"></div>
                <button className="tool-btn"><span className="material-symbols-outlined">undo</span></button>
                <button className="tool-btn"><span className="material-symbols-outlined">redo</span></button>
            </div>
            <div className="canvas-area">
                <div className="note-card yellow" style={{ top: '100px', left: '100px' }}>
                    Compare "Hard" vs "Soft" magic systems
                </div>
                <div className="note-card blue" style={{ top: '150px', left: '400px' }}>
                    Theme: Isolation
                </div>
                <div className="connector" style={{ top: '130px', left: '300px', width: '100px' }}></div>
            </div>
        </div>
    );
};

export default BrainstormingView;
