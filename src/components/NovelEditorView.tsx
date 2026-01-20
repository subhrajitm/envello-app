import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createEditor, Descendant, Node, BaseEditor, Editor, Range, Transforms, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps, ReactEditor, useSlate, useFocused } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import './NovelEditorView.css';

interface NovelEditorProps {
    novelId: string;
    onBack: () => void;
}

type CustomText = { text: string; bold?: boolean; italic?: boolean; underline?: boolean }
type ParagraphElement = { type: 'paragraph'; children: CustomText[] }
type BlockQuoteElement = { type: 'block-quote'; children: CustomText[] }
type CustomElement = ParagraphElement | BlockQuoteElement

declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor & HistoryEditor
        Element: CustomElement
        Text: CustomText
    }
}
const toggleMark = (editor: Editor, format: string) => {
    const isActive = isMarkActive(editor, format)

    if (isActive) {
        Editor.removeMark(editor, format)
    } else {
        Editor.addMark(editor, format, true)
    }
}

const isMarkActive = (editor: Editor, format: string) => {
    const marks = Editor.marks(editor)
    return marks ? marks[format as keyof Omit<CustomText, 'text'>] === true : false
}

const HoveringToolbar = () => {
    const ref = useRef<HTMLDivElement | null>(null)
    const editor = useSlate()
    const inFocus = useFocused()

    useEffect(() => {
        const el = ref.current
        const { selection } = editor

        if (!el) {
            return
        }

        if (
            !selection ||
            !inFocus ||
            Range.isCollapsed(selection) ||
            Editor.string(editor, selection) === ''
        ) {
            el.removeAttribute('style')
            return
        }

        const domSelection = window.getSelection()
        if (!domSelection || domSelection.rangeCount === 0) return

        const domRange = domSelection.getRangeAt(0)
        const rect = domRange.getBoundingClientRect()

        // Calculate position relative to the editor container or viewport
        // We'll use fixed positioning for simplicity and reliability with the portal-like behavior
        el.style.opacity = '1'
        el.style.top = `${rect.top + window.scrollY - el.offsetHeight - 10}px`
        el.style.left = `${rect.left + window.scrollX - el.offsetWidth / 2 + rect.width / 2}px`
    })

    return (
        <div ref={ref} className="ne-floating-toolbar">
            <FormatButton format="bold" icon="format_bold" />
            <FormatButton format="italic" icon="format_italic" />
            <FormatButton format="underline" icon="format_underlined" />
        </div>
    )
}

const FormatButton = ({ format, icon }: { format: string; icon: string }) => {
    const editor = useSlate()
    return (
        <button
            className={`ne-toolbar-btn ${isMarkActive(editor, format) ? 'active' : ''}`}
            onMouseDown={event => {
                event.preventDefault()
                toggleMark(editor, format)
            }}
        >
            <span className="material-symbols-outlined icon-sm">{icon}</span>
        </button>
    )
}
const toggleBlock = (editor: Editor, format: string) => {
    const isActive = isBlockActive(editor, format)
    const newProperties: Partial<CustomElement> = {
        type: isActive ? 'paragraph' : (format as 'paragraph' | 'block-quote'),
    }
    Transforms.setNodes<CustomElement>(editor, newProperties)
}

const isBlockActive = (editor: Editor, format: string) => {
    const { selection } = editor
    if (!selection) return false

    const [match] = Array.from(
        Editor.nodes(editor, {
            at: Editor.unhangRange(editor, selection),
            match: n =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n.type === format,
        })
    )

    return !!match
}

const FixedToolbar = () => {
    const editor = useSlate()
    return (
        <div className="ne-fixed-toolbar">
            <div className="ne-toolbar-group">
                <BlockButton format="block-quote" icon="format_quote" />
            </div>
            <div className="ne-toolbar-divider"></div>
            <div className="ne-toolbar-group">
                <FormatButton format="bold" icon="format_bold" />
                <FormatButton format="italic" icon="format_italic" />
                <FormatButton format="underline" icon="format_underlined" />
            </div>
        </div>
    )
}

const BlockButton = ({ format, icon }: { format: string; icon: string }) => {
    const editor = useSlate()
    return (
        <button
            className={`ne-toolbar-btn ${isBlockActive(editor, format) ? 'active' : ''}`}
            onMouseDown={event => {
                event.preventDefault()
                toggleBlock(editor, format)
            }}
            title={format === 'block-quote' ? 'Quote' : format}
        >
            <span className="material-symbols-outlined icon-sm">{icon}</span>
        </button>
    )
}

const initialValue: Descendant[] = [
    {
        type: 'paragraph',
        children: [
            { text: 'The sun hung low over the horizon, casting long, golden shadows across the orchard. Arthur adjusted his spectacles, the weight of the manuscript heavy in his satchel. It was time. He had waited three years for this moment, but as he stood before the heavy oak doors, his resolve wavered. The wind whispered secrets through the leaves, a soft rustle that sounded almost like a warning.' },
        ],
    },
    {
        type: 'paragraph',
        children: [
            { text: 'He stepped forward, the gravel crunching beneath his boots. Every step felt like a mile, every breath a triumph. Behind him, the world he knew was fading; ahead, a story yet to be written. The AI pulse in his pocket vibrated—a gentle reminder that he wasn\'t alone in this creative endeavor.' },
        ],
    },
    {
        type: 'block-quote',
        children: [
            { text: '"You should go inside now," a small voice echoed in his mind, or perhaps it was the device. Arthur looked up. The lights in the upper window of the manor flickered once, then twice, mimicking the rhythmic beat of a mechanical heart. He took a deep breath, the scent of overripe fruit filling his lungs, and reached for the iron knocker.' },
        ],
    },
    {
        type: 'paragraph',
        children: [
            { text: 'The door didn\'t wait for him to strike. It creaked open, just a sliver, revealing a darkness that seemed more intentional than accidental. "Is anyone there?" Arthur\'s voice sounded thin, frail against the vast silence of the orchard. No answer came, only the smell of old paper and ozone—the signature scent of the Banana Conservatory.' }
        ]
    }
];

const NovelEditorView: React.FC<NovelEditorProps> = ({ novelId, onBack }) => {
    // Slate editor setup
    const editor = useMemo(() => withHistory(withReact(createEditor())), []);
    // Initial value state
    const [value, setValue] = useState<Descendant[]>(initialValue);

    const [chapterTitle, setChapterTitle] = useState('Chapter 1: The First Peel');
    const [wordCount, setWordCount] = useState(1240);
    const [activeChapter, setActiveChapter] = useState('01');
    const [activeRightTab, setActiveRightTab] = useState('AI');

    const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({ '01': true });

    const toggleChapter = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Calculate word count on change
    const handleChange = (newValue: Descendant[]) => {
        setValue(newValue);
        const text = newValue.map(n => Node.string(n)).join('\n');
        const count = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        setWordCount(count);
    };

    const renderElement = useCallback((props: RenderElementProps) => {
        switch (props.element.type) {
            case 'block-quote':
                return <blockquote {...props.attributes} className="ne-quote-block">{props.children}</blockquote>;
            default:
                return <p {...props.attributes}>{props.children}</p>;
        }
    }, []);

    const renderLeaf = useCallback((props: RenderLeafProps) => {
        let { children } = props
        if (props.leaf.bold) {
            children = <strong>{children}</strong>
        }
        if (props.leaf.italic) {
            children = <em>{children}</em>
        }
        if (props.leaf.underline) {
            children = <u>{children}</u>
        }
        return <span {...props.attributes}>{children}</span>
    }, []);

    const chapters = [
        {
            id: '01',
            title: '01. The First Peel',
            meta: '1,240 words',
            scenes: ['Scene 1: Orchard Entrance', 'Scene 2: The Inner Hall', 'Scene 3: The Discovery']
        },
        {
            id: '02',
            title: '02. Bitter Rinds',
            meta: 'DRAFT',
            tagClass: 'ne-draft-tag',
            scenes: ['Scene 1: Market Dispute', 'Scene 2: Shadow Encounter']
        },
        {
            id: '03',
            title: '03. Harvest Moon',
            meta: 'EMPTY',
            tagClass: 'ne-empty-tag',
            scenes: []
        }
    ];

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
                            {chapters.map(chapter => (
                                <div key={chapter.id} className="ne-chapter-group">
                                    <div
                                        className={`ne-chapter-item ${activeChapter === chapter.id ? 'active' : ''}`}
                                        onClick={() => setActiveChapter(chapter.id)}
                                    >
                                        <button
                                            className="ne-collapse-btn"
                                            onClick={(e) => toggleChapter(e, chapter.id)}
                                        >
                                            <span className="material-symbols-outlined icon-xs">
                                                {expandedChapters[chapter.id] ? 'expand_more' : 'chevron_right'}
                                            </span>
                                        </button>
                                        <div className="ne-chap-info">
                                            <div className="ne-chap-title">{chapter.title}</div>
                                            <div className={`ne-chap-meta ${chapter.tagClass || ''}`}>{chapter.meta}</div>
                                        </div>
                                    </div>

                                    {expandedChapters[chapter.id] && chapter.scenes.length > 0 && (
                                        <div className="ne-scene-list">
                                            {chapter.scenes.map((scene, idx) => (
                                                <div key={idx} className="ne-scene-item">
                                                    <span className="sc-dot"></span>
                                                    {scene}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
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
                        <input
                            className="ne-doc-title-input"
                            value={chapterTitle}
                            onChange={(e) => setChapterTitle(e.target.value)}
                            placeholder="Chapter Title"
                        />
                        <div className="ne-doc-meta">
                            <span className="meta-ver">DRAFT V2.4</span>
                            <span className="meta-sep">•</span>
                            <span className="meta-scene">SCENE: THE ORCHARD ENTRANCE</span>
                        </div>

                        <Slate editor={editor} initialValue={value} onChange={handleChange}>
                            <FixedToolbar />
                            <HoveringToolbar />
                            <Editable
                                className="ne-editor-text"
                                renderElement={renderElement}
                                renderLeaf={renderLeaf}
                                placeholder="Start writing your chapter..."
                                spellCheck
                                autoFocus
                            />
                        </Slate>

                        <div className="ne-editor-footer">
                            <div className="editor-stats-pill">
                                <span>WORDS <strong>{wordCount.toLocaleString()}/2,000</strong></span>
                                <span className="stat-sep">|</span>
                                <span>READING TIME <strong>{Math.ceil(wordCount / 250)}m</strong></span>
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
