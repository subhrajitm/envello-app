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
      icon: 'description',
      progress: 58,
    },
    {
      id: '2',
      title: 'Neon Orchard Chronicles',
      status: 'PLANNING',
      wordCount: '12,500',
      lastUpdated: 'Yesterday, 14:20',
      icon: 'description',
      progress: 15,
    },
    {
      id: '3',
      title: 'The Scent of Green',
      status: 'PUBLISHED',
      wordCount: '82,100',
      lastUpdated: 'Oct 24, 2023',
      icon: 'check_circle',
      progress: 100,
    },
    {
      id: '4',
      title: 'Echoes of the Void',
      status: 'REVISING',
      wordCount: '35,000',
      lastUpdated: '3 days ago',
      icon: 'description',
      progress: 42,
    },
    {
      id: '5',
      title: 'Midnight in Berlin',
      status: 'DRAFTING',
      wordCount: '15,200',
      lastUpdated: 'Nov 01, 2023',
      icon: 'description',
      progress: 18,
    },
  ]);

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
      {/* Sub-Header / Metrics Bar */}
      <div className="novels-sub-header">
        <div className="metrics-group">
          <div className="metric-item">
            <span className="metric-label">TOTAL WORDS IN NOVELS</span>
            <span className="metric-value-lg text-yellow">142,580</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">ACTIVE DRAFTS</span>
            <span className="metric-value-lg">04</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">AVG. COMPLETION</span>
            <span className="metric-value-lg">64%</span>
          </div>
        </div>

        <div className="controls-group">
          <button className="control-btn-dark">All Statuses</button>
          <button className="control-btn-dark">Sort by: Last Updated</button>
          <button className="control-icon-btn">
            <span className="material-symbols-outlined icon-sm">filter_list</span>
          </button>
        </div>
      </div>

      <div className="novels-content-area">
        <div className="novels-table">
          <div className="table-header">
            <div className="col-title">PROJECT TITLE</div>
            <div className="col-status">STATUS</div>
            <div className="col-word-count">WORD COUNT</div>
            <div className="col-last-updated">LAST UPDATED</div>
            <div className="col-menu"></div>
          </div>
          <div className="table-body">
            {novels.map((novel) => (
              <div key={novel.id} className="table-row">
                <div className="col-title">
                  <span className="material-symbols-outlined project-icon">{novel.icon}</span>
                  {novel.title}
                </div>
                <div className="col-status">
                  <span className={`status-badge-caps ${getStatusColor(novel.status)}`}>
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
                  <button className="menu-btn">
                    <span className="material-symbols-outlined icon-sm">more_vert</span>
                  </button>
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