import React, { useState } from 'react';
import Header from './Header';
import OverviewView from './OverviewView';
import NovelsView from './NovelsView';
import ResearchView from './ResearchView';
import ArticlesView from './ArticlesView';
import JournalsView from './JournalsView';
import TasksView from './TasksView';
import MeetingsView from './MeetingsView';
import BooksView from './BooksView';
import CodeSnippetsView from './CodeSnippetsView';
import BrainstormingView from './BrainstormingView';
import DailyNotesView from './DailyNotesView';
import Footer from './Footer';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');

  // Views that have sidebars should have no padding on dashboard-content
  const viewsWithSidebar = [
    'Overview',
    'Novels/Fiction',
    'Research',
    'Articles/Blogs',
    'Journals',
    'Daily Notes',
    'Tasks/Todos',
    'Meetings',
    'Books/Reading',
    'Code Snippets',
    'Brainstorming',
  ];

  const hasSidebar = viewsWithSidebar.includes(activeTab);
  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return <OverviewView />;
      case 'Novels/Fiction':
        return <NovelsView />;
      case 'Research':
        return <ResearchView />;
      case 'Articles/Blogs':
        return <ArticlesView categoryName={activeTab} />;
      case 'Journals':
        return <JournalsView />;
      case 'Daily Notes':
        return <DailyNotesView />;
      case 'Tasks/Todos':
        // ... existing code ...
        return <TasksView />;
      case 'Meetings':
        return <MeetingsView />;
      case 'Books/Reading':
        return <BooksView />;
      case 'Code Snippets':
        return <CodeSnippetsView />;
      case 'Brainstorming':
        return <BrainstormingView />;
      default:
        return <OverviewView />;
    }
  };

  const isImmersive = activeTab === 'Brainstorming';

  return (
    <div className="dashboard">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className={`dashboard-content ${hasSidebar ? 'no-padding' : ''} ${isImmersive ? 'immersive-view' : ''}`}>
        {renderContent()}
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;