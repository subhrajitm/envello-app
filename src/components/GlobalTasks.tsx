import React, { useState } from 'react';
import './GlobalTasks.css';

interface Task {
  id: string;
  title: string;
  priority: 'HIGH' | 'MED' | 'LOW';
  dueDate: string;
  type?: string;
}

const GlobalTasks: React.FC = () => {
  const [tasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Review editor comments on Ch. 2',
      priority: 'HIGH',
      dueDate: 'Today',
    },
    {
      id: '2',
      title: 'Outline Part III research',
      priority: 'MED',
      dueDate: 'Tomorrow',
    },
    {
      id: '3',
      title: 'Sync with marketing team',
      priority: 'HIGH',
      dueDate: 'Thu, 10:00',
      type: 'PROJECT SYNC',
    },
  ]);

  const highPriorityCount = tasks.filter((t) => t.priority === 'HIGH').length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'priority-high';
      case 'MED':
        return 'priority-med';
      case 'LOW':
        return 'priority-low';
      default:
        return 'priority-low';
    }
  };

  return (
    <div className="global-tasks">
      <div className="section-header">
        <div className="section-title">
          <span className="section-icon">📝</span>
          GLOBAL TASKS
          {highPriorityCount > 0 && (
            <span className="badge-high">{highPriorityCount} High</span>
          )}
        </div>
      </div>
      <div className="tasks-list">
        {tasks.map((task) => (
          <div key={task.id} className="task-item">
            <input type="checkbox" className="task-checkbox" />
            <div className="task-content">
              <div className="task-title">{task.title}</div>
              <div className="task-meta">
                {task.type && (
                  <span className="task-type">{task.type}</span>
                )}
                <span className={`priority-badge ${getPriorityColor(task.priority)}`}>
                  {task.priority} PRIORITY
                </span>
                <span className="task-due">Due {task.dueDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalTasks;