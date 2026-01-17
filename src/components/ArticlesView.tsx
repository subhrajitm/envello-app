import React, { useState } from 'react';
import './ArticlesView.css';

interface Article {
  id: string;
  title: string;
  platform: string;
  pipeline: 'PUBLISHED' | 'DRAFT' | 'REVIEW' | 'SCHEDULED';
  wordCount: string;
  engagement?: {
    views: string;
    comments: string;
  };
  lastUpdated: string;
  icon: string;
}

interface ArticlesViewProps {
  categoryName?: string;
}

const ArticlesView: React.FC<ArticlesViewProps> = ({ categoryName = 'Articles/Blogs' }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('All Platforms');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');

  const articles: Article[] = [
    {
      id: '1',
      title: 'Scaling Enterprise SaaS: The 2024 Architecture Guide',
      platform: 'Medium',
      pipeline: 'PUBLISHED',
      wordCount: '2,450',
      engagement: { views: '12.4k', comments: '842' },
      lastUpdated: 'Oct 28, 2023 · 14:02',
      icon: '📄',
    },
    {
      id: '2',
      title: 'The Future of Remote-First Management Styles',
      platform: 'Substack',
      pipeline: 'DRAFT',
      wordCount: '1,120',
      lastUpdated: '2 hours ago',
      icon: '✏️',
    },
    {
      id: '3',
      title: 'Why "Nano Banana" Aesthetic is Taking Over UX Design',
      platform: 'Blog',
      pipeline: 'REVIEW',
      wordCount: '850',
      lastUpdated: 'Yesterday, 18:45',
      icon: '💬',
    },
    {
      id: '4',
      title: 'Monthly Roundup: October Tech Innovations',
      platform: 'Medium',
      pipeline: 'SCHEDULED',
      wordCount: '3,100',
      engagement: { views: 'Pending', comments: '' },
      lastUpdated: 'Oct 26, 2023 · 09:15',
      icon: '📅',
    },
    {
      id: '5',
      title: 'The Rise of the Project Manager Creator',
      platform: 'Substack',
      pipeline: 'PUBLISHED',
      wordCount: '1,820',
      engagement: { views: '3.1k', comments: '112' },
      lastUpdated: 'Oct 22, 2023 · 21:30',
      icon: '📄',
    },
  ];

  const getPipelineColor = (pipeline: string) => {
    switch (pipeline) {
      case 'PUBLISHED':
        return 'pipeline-green';
      case 'DRAFT':
        return 'pipeline-yellow';
      case 'REVIEW':
        return 'pipeline-blue';
      case 'SCHEDULED':
        return 'pipeline-orange';
      default:
        return 'pipeline-gray';
    }
  };

  return (
    <div className="articles-view">
      <div className="articles-filters">
        <div className="filter-group">
          <span className="filter-label">PLATFORM:</span>
          <button
            className={`filter-btn ${selectedPlatform === 'All Platforms' ? 'active' : ''}`}
            onClick={() => setSelectedPlatform('All Platforms')}
          >
            All Platforms
          </button>
        </div>
        <div className="filter-group">
          <span className="filter-label">PIPELINE:</span>
          <button
            className={`filter-btn ${selectedStatus === 'All Statuses' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('All Statuses')}
          >
            All Statuses
          </button>
        </div>
        <div className="filter-group-right">
          <button className="filter-btn">
            🔍 Advanced Filters
          </button>
        </div>
      </div>

      <div className="articles-content">
        <div className="articles-main">
          <div className="articles-table-section">
            <div className="articles-table">
              <div className="table-header">
                <div className="col-title">ARTICLE TITLE</div>
                <div className="col-platform">PLATFORM</div>
                <div className="col-pipeline">PIPELINE</div>
                <div className="col-word-count">WORD COUNT</div>
                <div className="col-engagement">ENGAGEMENT</div>
                <div className="col-last-updated">LAST UPDATED</div>
              </div>
              <div className="table-body">
                {articles.map((article) => (
                  <div key={article.id} className="table-row">
                    <div className="col-title">
                      <span className="article-icon">{article.icon}</span>
                      {article.title}
                    </div>
                    <div className="col-platform">{article.platform}</div>
                    <div className="col-pipeline">
                      <span className={`pipeline-badge ${getPipelineColor(article.pipeline)}`}>
                        {article.pipeline}
                      </span>
                    </div>
                    <div className="col-word-count">{article.wordCount}</div>
                    <div className="col-engagement">
                      {article.engagement ? (
                        <>
                          {article.engagement.views !== 'Pending' ? (
                            <>
                              <span className="engagement-item">
                                <span className="engagement-icon">👁️</span>
                                {article.engagement.views}
                              </span>
                              {article.engagement.comments && (
                                <span className="engagement-item">
                                  <span className="engagement-icon">💬</span>
                                  {article.engagement.comments}
                                </span>
                              )}
                            </>
                          ) : (
                            <span>Pending</span>
                          )}
                        </>
                      ) : (
                        <span>--</span>
                      )}
                    </div>
                    <div className="col-last-updated">{article.lastUpdated}</div>
                    <div className="col-menu">
                      <button className="menu-btn">⋮</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="articles-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">
              <span className="sidebar-title-underline">CURRENT CAPACITY</span>
            </div>
            <div className="capacity-value">12 Active Projects</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticlesView;