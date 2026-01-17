import React, { useState } from 'react';
import './ResearchView.css';

interface ResearchItem {
  id: string;
  title: string;
  description: string;
  sourceType: 'WEB' | 'PDF' | 'INTERVIEW' | 'PHYSICAL';
  relevance: string;
  tags: string[];
  icon: string;
  actionIcon: string;
}

const ResearchView: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState('All Research');
  const [verifiedChecked, setVerifiedChecked] = useState(true);
  const [unreadChecked, setUnreadChecked] = useState(false);
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');

  const researchItems: ResearchItem[] = [
    {
      id: '1',
      title: 'Victorian London Architecture',
      description: 'britishlibrary.org.uk/arch-history-1850',
      sourceType: 'WEB',
      relevance: 'Project Alpha',
      tags: ['History', 'Urban'],
      icon: '🌐',
      actionIcon: '🔗',
    },
    {
      id: '2',
      title: 'Martian Soil Composition (Survey-2044)',
      description: 'Local Storage / Research / Science / PDF',
      sourceType: 'PDF',
      relevance: 'Mars Colony: Epsilon',
      tags: ['Science', 'Environment'],
      icon: '📄',
      actionIcon: '👁️',
    },
    {
      id: '3',
      title: 'Interview with Dr. Aris Thorne',
      description: 'Audio Recording - 42:15 mins',
      sourceType: 'INTERVIEW',
      relevance: 'The Green Scent',
      tags: ['Botany', 'Expert'],
      icon: '🎙️',
      actionIcon: '▶️',
    },
    {
      id: '4',
      title: 'The Industrial Evolution (Chapter 4)',
      description: 'Physical Book - Page 112-145',
      sourceType: 'PHYSICAL',
      relevance: 'Project Alpha',
      tags: ['Steampunk'],
      icon: '📚',
      actionIcon: '🔖',
    },
    {
      id: '5',
      title: 'Atmospheric Pressure on Highlands',
      description: 'nasa.gov/mars/atmosphere-data',
      sourceType: 'WEB',
      relevance: 'Mars Colony: Epsilon',
      tags: ['Physics', 'Atmosphere'],
      icon: '🌐',
      actionIcon: '🔗',
    },
  ];

  const projects = [
    { name: 'All Research', count: 124, active: selectedProject === 'All Research' },
    { name: 'Victorian London Project', count: 42, active: selectedProject === 'Victorian London Project' },
    { name: 'Mars Colony: Epsilon', count: 18, active: selectedProject === 'Mars Colony: Epsilon' },
    { name: 'The Green Scent', count: 31, active: selectedProject === 'The Green Scent' },
  ];

  const topics = ['Architecture', 'Sociology', 'Technology', 'Botany'];

  const getSourceTypeColor = (type: string) => {
    switch (type) {
      case 'WEB':
        return 'source-blue';
      case 'PDF':
        return 'source-red';
      case 'INTERVIEW':
        return 'source-purple';
      case 'PHYSICAL':
        return 'source-orange';
      default:
        return 'source-gray';
    }
  };

  return (
    <div className="research-view">
      <div className="research-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">FILTERS</div>
          
          <div className="filter-group">
            <div className="filter-label">BY PROJECT:</div>
            {projects.map((project) => (
              <button
                key={project.name}
                className={`project-filter ${project.active ? 'active' : ''}`}
                onClick={() => setSelectedProject(project.name)}
              >
                {project.name} <span className="filter-count">{project.count}</span>
              </button>
            ))}
          </div>

          <div className="filter-group">
            <div className="filter-label">BY TOPIC:</div>
            <ul className="topic-list">
              {topics.map((topic) => (
                <li key={topic} className="topic-item">
                  • {topic}
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-group">
            <div className="filter-label">SOURCE STATUS:</div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={verifiedChecked}
                onChange={(e) => setVerifiedChecked(e.target.checked)}
              />
              <span>Verified</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={unreadChecked}
                onChange={(e) => setUnreadChecked(e.target.checked)}
              />
              <span>Unread</span>
            </label>
          </div>
        </div>
      </div>

      <div className="research-main">
        <div className="research-header">
          <div>
            <h2 className="research-title">Research Inventory</h2>
            <p className="research-subtitle">Displaying all items across projects</p>
          </div>
        </div>

        <div className="research-stats">
          <div className="stat-item">
            <span className="stat-label">TOTAL SOURCES</span>
            <span className="stat-value">124</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">PDF DOCS</span>
            <span className="stat-value">45</span>
          </div>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'TABLE' ? 'active' : ''}`}
              onClick={() => setViewMode('TABLE')}
            >
              TABLE
            </button>
            <button
              className={`view-btn ${viewMode === 'GRID' ? 'active' : ''}`}
              onClick={() => setViewMode('GRID')}
            >
              GRID
            </button>
          </div>
          <div className="sort-controls">
            <select className="sort-select">
              <option>Source: All</option>
            </select>
            <select className="sort-select">
              <option>Sort: Relevance</option>
            </select>
            <button className="icon-btn">⬇️</button>
          </div>
        </div>

        <div className="research-table-section">
          <div className="research-table">
            <div className="table-header">
              <div className="col-research-item">RESEARCH ITEM</div>
              <div className="col-source-type">SOURCE TYPE</div>
              <div className="col-relevance">RELEVANCE</div>
              <div className="col-tags">TAGS</div>
            </div>
            <div className="table-body">
              {researchItems.map((item) => (
                <div key={item.id} className="table-row">
                  <div className="col-research-item">
                    <span className="item-icon">{item.icon}</span>
                    <div className="item-content">
                      <div className="item-title">{item.title}</div>
                      <div className="item-description">{item.description}</div>
                    </div>
                  </div>
                  <div className="col-source-type">
                    <span className={`source-badge ${getSourceTypeColor(item.sourceType)}`}>
                      {item.sourceType}
                    </span>
                  </div>
                  <div className="col-relevance">
                    <span className="relevance-icon">🔗</span>
                    {item.relevance}
                  </div>
                  <div className="col-tags">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="col-action">
                    <button className="action-btn">{item.actionIcon}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchView;