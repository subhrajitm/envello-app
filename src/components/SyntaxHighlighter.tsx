import React, { useMemo } from 'react';
import './SyntaxHighlighter.css';

interface Props {
    code: string;
    language: string;
}

const SyntaxHighlighter: React.FC<Props> = ({ code, language }) => {
    const highlightedCode = useMemo(() => {
        let html = code;

        // Escape HTML entities first
        html = html.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        if (language.toLowerCase() === 'python') {
            // Python Syntax Highlighting
            // Comments
            html = html.replace(/(#.*)/g, '<span class="token comment">$1</span>');
            // Strings (simple quotes)
            html = html.replace(/(".*?"|'.*?')/g, '<span class="token string">$1</span>');
            // Keywords
            const keywords = ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'try', 'except', 'raise', 'print', 'self'];
            const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
            html = html.replace(keywordRegex, '<span class="token keyword">$1</span>');
            // Decorators
            html = html.replace(/(@\w+)/g, '<span class="token decorator">$1</span>');
            // Function calls
            html = html.replace(/(\w+)(?=\()/g, '<span class="token function">$1</span>');

        } else if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
            // JS/TS Syntax Highlighting
            // Comments
            html = html.replace(/(\/\/.*)/g, '<span class="token comment">$1</span>');
            // Strings
            html = html.replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="token string">$1</span>');
            // Keywords
            const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'import', 'export', 'default', 'class', 'extends', 'new', 'this'];
            const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
            html = html.replace(keywordRegex, '<span class="token keyword">$1</span>');
            // Function calls
            html = html.replace(/(\w+)(?=\()/g, '<span class="token function">$1</span>');
        }

        return html;
    }, [code, language]);

    return (
        <div className="syntax-highlighter">
            <pre dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </div>
    );
};

export default SyntaxHighlighter;
