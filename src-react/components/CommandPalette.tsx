import React, { useState, useEffect, useRef } from 'react';
import './CommandPalette.css';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

interface CommandOption {
    id: string;
    label: string;
    icon: string;
    type: 'navigation' | 'action';
    target?: string; // Tab name for navigation
    shortcut?: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const options: CommandOption[] = [
        // Navigation
        { id: 'nav-overview', label: 'Go to Overview', icon: 'dashboard', type: 'navigation', target: 'Overview' },
        { id: 'nav-daily', label: 'Go to Daily Notes', icon: 'edit_note', type: 'navigation', target: 'Daily Notes' },
        { id: 'nav-journals', label: 'Go to Journals', icon: 'book', type: 'navigation', target: 'Journals' },
        { id: 'nav-snippets', label: 'Go to Code Snippets', icon: 'code', type: 'navigation', target: 'Code Snippets' },
        { id: 'nav-brainstorm', label: 'Go to Brainstorming', icon: 'psychology', type: 'navigation', target: 'Brainstorming' },
        { id: 'nav-research', label: 'Go to Research', icon: 'library_books', type: 'navigation', target: 'Research' },
        { id: 'nav-tasks', label: 'Go to Tasks', icon: 'check_circle', type: 'navigation', target: 'Tasks/Todos' },

        // Actions (Mock)
        { id: 'act-new-note', label: 'Create New Daily Note', icon: 'note_add', type: 'action', shortcut: 'N' },
        { id: 'act-theme', label: 'Toggle Dark/Light Theme', icon: 'dark_mode', type: 'action', shortcut: 'T' },
        { id: 'act-settings', label: 'Open Settings', icon: 'settings', type: 'action', shortcut: ',' },
    ];

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = filteredOptions[selectedIndex];
            if (selected) executeCommand(selected);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const executeCommand = (option: CommandOption) => {
        if (option.type === 'navigation' && option.target) {
            onNavigate(option.target);
        } else {
            console.log(`Executing action: ${option.label}`);
            // Mock action feedback
            alert(`Action triggered: ${option.label}`);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="cmd-overlay" onClick={onClose}>
            <div className="cmd-modal" onClick={e => e.stopPropagation()}>
                <div className="cmd-header">
                    <span className="material-symbols-outlined search-icon">search</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="cmd-input"
                        placeholder="Type a command or search..."
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="cmd-badge">ESC</div>
                </div>

                <div className="cmd-list">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, index) => (
                            <div
                                key={opt.id}
                                className={`cmd-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => executeCommand(opt)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span className="material-symbols-outlined cmd-icon">{opt.icon}</span>
                                <span className="cmd-label">{opt.label}</span>
                                {opt.shortcut && <span className="cmd-shortcut">{opt.shortcut}</span>}
                                {opt.type === 'navigation' && <span className="cmd-type">Jump to</span>}
                            </div>
                        ))
                    ) : (
                        <div className="cmd-empty">No matching commands</div>
                    )}
                </div>

                <div className="cmd-footer">
                    <span><span className="key">↑</span><span className="key">↓</span> to navigate</span>
                    <span><span className="key">↵</span> to select</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
