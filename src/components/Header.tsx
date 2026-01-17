import React from 'react';
import './Header.css';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    'Overview',
    'Daily Notes',
    'Novels/Fiction',
    'Journals',
    'Research',
    'Articles/Blogs',
    'Meetings',
    'Tasks/Todos',
    'Books/Reading',
    'Code Snippets',
    'Brainstorming',
  ];

  return (
    <header className="header">
      <div className="header-top">
        <div className="logo">
          <span className="logo-icon">🍌</span>
          <span className="logo-text">ENVELLO</span>
        </div>
        <div className="header-search">
          <input
            type="text"
            placeholder="Quick find across all categories (Cmd + K)"
            className="search-input"
          />
        </div>
        <div className="header-actions">
          <button className="btn-new-project">
            + New Project
          </button>
          <button className="icon-btn">🔔</button>
          <button className="icon-btn">⬜</button>
        </div>
      </div>
      <nav className="header-nav">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
    </header>
  );
};

export default Header;