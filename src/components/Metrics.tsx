import React from 'react';
import './Metrics.css';

const Metrics: React.FC = () => {
  return (
    <div className="metrics">
      <div className="metric-card">
        <div className="metric-label">TOTAL PRODUCTIVITY SCORE</div>
        <div className="metric-value">
          84.2
          <span className="metric-change positive">+5.2%</span>
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">ACTIVE PROJECTS</div>
        <div className="metric-value">12</div>
        <div className="metric-sub">4 Categories</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">WEEKLY WORD COUNT</div>
        <div className="metric-value">14,250</div>
        <div className="metric-sub">Goal: 20k</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">NEXT DEADLINE</div>
        <div className="metric-value">2 Days</div>
        <div className="metric-sub">Draft 2A</div>
      </div>
    </div>
  );
};

export default Metrics;