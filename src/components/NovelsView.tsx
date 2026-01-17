import React, { useState } from 'react';
import './NovelsView.css';

interface Novel {
  id: string;
  title: string;
  status: 'DRAFTING' | 'PLANNING' | 'PUBLISHED' | 'REVISING';
  wordCount: string;
  lastUpdated: string;
  icon: string;
  progress: number; // 0-100
}

const NovelsView: React.FC = () => {
  const [novels] = useState<Novel[]>([
    {
      id: '1',
      title: 'Project Alpha: Final Manuscript',
      status: 'DRAFTING',
      wordCount: '48,240',
      lastUpdated: '2h ago',
      icon: '📄',
      progress: 58,
    },
    {
      id: '2',
      title: 'Neon Orchard Chronicles',
      status: 'PLANNING',
      wordCount: '12,500',
      lastUpdated: 'Yesterday, 14:20',
      icon: '📄',
      progress: 15,
    },
    {
      id: '3',
      title: 'The Scent of Green',
      status: 'PUBLISHED',
      wordCount: '82,100',
      lastUpdated: 'Oct 24, 2023',
      icon: '✅',
      progress: 100,
    },
    {
      id: '4',
      title: 'Echoes of the Void',
      status: 'REVISING',
      wordCount: '35,000',
      lastUpdated: '3 days ago',
      icon: '📄',
      progress: 42,
    },
    {
      id: '5',
      title: 'Midnight in Berlin',
      status: 'DRAFTING',
      wordCount: '15,200',
      lastUpdated: 'Nov 01, 2023',
      icon: '📄',
      progress: 18,
    },
  ]);

  const totalWords = 142580;
  const activeDrafts = 4;
  const avgCompletion = 64;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFTING':
        return 'status-yellow';
      case 'PLANNING':
        return 'status-gray';
      case 'PUBLISHED':
        return 'status-green';
      case 'REVISING':
        return 'status-orange';
      default:
        return 'status-gray';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return '#4ade80';
      default:
        return '#ffd700';
    }
  };

  return (
    <div className="novels-view">
      <div className="novels-metrics">
        <div className="novel-metric">
          <div className="novel-metric-label">TOTAL WORDS IN NOVELS</div>
          <div className="novel-metric-value">{totalWords.toLocaleString()}</div>
        </div>
        <div className="novel-metric">
          <div className="novel-metric-label">ACTIVE DRAFTS</div>
          <div className="novel-metric-value">{String(activeDrafts).padStart(2, '0')}</div>
        </div>
        <div className="novel-metric">
          <div className="novel-metric-label">AVG. COMPLETION</div>
          <div className="novel-metric-value">{avgCompletion}%</div>
        </div>
      </div>

      <div className="novels-table-section">
        <div className="table-controls">
          <button className="control-btn">All Statuses</button>
          <button className="control-btn">
            Sort by: Last Updated <span className="filter-icon">🔽</span>
          </button>
        </div>

        <div className="novels-table">
          <div className="table-header">
            <div className="col-title">PROJECT TITLE</div>
            <div className="col-status">STATUS</div>
            <div className="col-word-count">WORD COUNT</div>
            <div className="col-last-updated">LAST UPDATED</div>
          </div>
          <div className="table-body">
            {novels.map((novel) => (
              <div key={novel.id} className="table-row">
                <div className="col-title">
                  <span className="project-icon">{novel.icon}</span>
                  {novel.title}
                </div>
                <div className="col-status">
                  <span className={`status-badge ${getStatusColor(novel.status)}`}>
                    {novel.status}
                  </span>
                </div>
                <div className="col-word-count">
                  <div className="word-count-content">
                    <span className="word-count-value">{novel.wordCount}</span>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${novel.progress}%`,
                          backgroundColor: getProgressColor(novel.status),
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="col-last-updated">{novel.lastUpdated}</div>
                <div className="col-menu">
                  <button className="menu-btn">⋯</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovelsView;