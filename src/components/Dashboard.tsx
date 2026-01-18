import React, { useState } from 'react';
import Header from './Header';
import OverviewView from './OverviewView';
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
        {activeTab === 'Overview' ? (
          <OverviewView />
        ) : activeTab === 'Novels/Fiction' ? (
          <NovelsView />
        ) : activeTab === 'Daily Notes' ? (
          <ResearchView />
        ) : articlesLayoutTabs.includes(activeTab) ? (
          <ArticlesView categoryName={activeTab} />
        ) : (
          <OverviewView />
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;