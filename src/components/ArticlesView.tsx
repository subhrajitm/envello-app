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

const ArticlesView: React.FC<ArticlesViewProps> = () => {
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
      icon: 'description',
    },
    {
      id: '2',
      title: 'The Future of Remote-First Management Styles',
      platform: 'Substack',
      pipeline: 'DRAFT',
      wordCount: '1,120',
      lastUpdated: '2 hours ago',
      icon: 'edit',
    },
    {
      id: '3',
      title: 'Why "Nano Banana" Aesthetic is Taking Over UX Design',
      platform: 'Blog',
      pipeline: 'REVIEW',
      wordCount: '850',
      lastUpdated: 'Yesterday, 18:45',
      icon: 'chat_bubble',
    },
    {
      id: '4',
      title: 'Monthly Roundup: October Tech Innovations',
      platform: 'Medium',
      pipeline: 'SCHEDULED',
      wordCount: '3,100',
      engagement: { views: 'Pending', comments: '' },
      lastUpdated: 'Oct 26, 2023 · 09:15',
      icon: 'calendar_today',
    },
    {
      id: '5',
      title: 'The Rise of the Project Manager Creator',
      platform: 'Substack',
      pipeline: 'PUBLISHED',
      wordCount: '1,820',
      engagement: { views: '3.1k', comments: '112' },
      lastUpdated: 'Oct 22, 2023 · 21:30',
      icon: 'description',
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
      {/* Sub-Header / Filter Bar */}
      <div className="articles-sub-header">
        <div className="filters-left">
          <div className="filter-item">
            <span className="filter-label">PLATFORM:</span>
            <button
              className={`filter-btn ${selectedPlatform === 'All Platforms' ? 'active' : ''}`}
              onClick={() => setSelectedPlatform('All Platforms')}
            >
              All Platforms
            </button>
          </div>
          <div className="filter-item">
            <span className="filter-label">PIPELINE:</span>
            <button
              className={`filter-btn ${selectedStatus === 'All Statuses' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('All Statuses')}
            >
              All Statuses
            </button>
          </div>
          <button className="filter-btn-icon">
            <span className="material-symbols-outlined icon-sm">filter_list</span>
            Advanced Filters
          </button>
        </div>

        <div className="filters-right">
          <div className="capacity-widget">
            <span className="capacity-label">CURRENT CAPACITY</span>
            <div className="capacity-bar-container">
              <div className="capacity-bar" style={{ width: '65%' }}></div>
            </div>
          </div>
          <div className="vertical-divider"></div>
          <span className="active-projects-count">12 Active Projects</span>
        </div>
      </div>

      <div className="articles-content-area">
        <div className="articles-table">
          <div className="table-header">
            <div className="col-title">ARTICLE TITLE</div>
            <div className="col-platform">PLATFORM</div>
            <div className="col-pipeline">PIPELINE</div>
            <div className="col-word-count">WORD COUNT</div>
            <div className="col-engagement">ENGAGEMENT</div>
            <div className="col-last-updated">LAST UPDATED</div>
            <div className="col-menu"></div>
          </div>
          <div className="table-body">
            {articles.map((article) => (
              <div key={article.id} className="table-row">
                <div className="col-title">
                  <span className="material-symbols-outlined article-icon">{article.icon}</span>
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
                            <span className="material-symbols-outlined engagement-icon">visibility</span>
                            {article.engagement.views}
                          </span>
                          {article.engagement.comments && (
                            <span className="engagement-item">
                              <span className="material-symbols-outlined engagement-icon">comment</span>
                              {article.engagement.comments}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">Pending</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted">--</span>
                  )}
                </div>
                <div className="col-last-updated">{article.lastUpdated}</div>
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

export default ArticlesView;