import React, { useState } from 'react';
import Header from './Header';
import Metrics from './Metrics';
import ProjectOversight from './ProjectOversight';
import GlobalTasks from './GlobalTasks';
import RecentActivity from './RecentActivity';
import Footer from './Footer';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="dashboard">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="dashboard-content">
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
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;