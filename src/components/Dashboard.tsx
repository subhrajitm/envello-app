import React, { useState } from 'react';
import Header from './Header';
import Metrics from './Metrics';
import ProjectOversight from './ProjectOversight';
import GlobalTasks from './GlobalTasks';
import RecentActivity from './RecentActivity';
import NovelsView from './NovelsView';
import ResearchView from './ResearchView';
import ArticlesView from './ArticlesView';
import Footer from './Footer';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');

  // Tabs that should show the Articles view layout
  const articlesLayoutTabs = [
    'Articles/Blogs',
    'Journals',
    'Meetings',
    'Books/Reading',
    'Code Snippets',
    'Brainstorming',
  ];

  return (
    <div className="dashboard">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="dashboard-content">
        {activeTab === 'Novels/Fiction' ? (
          <NovelsView />
        ) : activeTab === 'Daily Notes' ? (
          <ResearchView />
        ) : articlesLayoutTabs.includes(activeTab) ? (
          <ArticlesView categoryName={activeTab} />
        ) : (
          <>
            <Metrics />
            <div className="dashboard-main">
              <div className="dashboard-left">
                <ProjectOversight />
                <RecentActivity />
              </div>
              <div className="dashboard-right">
                <GlobalTasks />
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;