import React, { useState } from 'react';
import './RecentActivity.css';

interface Activity {
  id: string;
  action: string;
  icon: string;
  time: string;
}

const RecentActivity: React.FC = () => {
  const [activities] = useState<Activity[]>([
    {
      id: '1',
      action: 'Edited Chapter 3 in Project Alpha',
      icon: '✏️',
      time: '14:20',
    },
    {
      id: '2',
      action: 'New Research Note added to Neon Orchard',
      icon: '👤',
      time: '12:10',
    },
    {
      id: '3',
      action: 'Cloud Backup completed for all projects',
      icon: '☁️',
      time: '09:45',
    },
  ]);

  return (
    <div className="recent-activity">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">🕒</span>
          RECENT ACTIVITY
        </div>
        <button className="view-all-link">View All</button>
      </div>
      <div className="activity-list">
        {activities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <span className="activity-icon">{activity.icon}</span>
            <div className="activity-content">
              <div className="activity-action">{activity.action}</div>
              <div className="activity-time">{activity.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;