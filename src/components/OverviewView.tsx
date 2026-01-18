import React, { useState } from 'react';
import './OverviewView.css';

interface TimelineTask {
  id: string;
  author: string;
  project: string;
  name: string;
  type: 'critical' | 'buffer' | 'delayed';
  startDate: string;
  endDate: string;
}

interface Task {
  id: string;
  description: string;
  project: string;
  assignee: string;
  assigneeInitials: string;
  impact: string;
  deadline: string;
  overdue?: boolean;
}

interface RiskAlert {
  id: string;
  type: 'resource' | 'dependency' | 'velocity';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionLink: string;
  actionText: string;
}

const OverviewView: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('Urgent');

  const timelineTasks: TimelineTask[] = [
    {
      id: '1',
      author: 'Sarah J.',
      project: 'Manuscript',
      name: 'Drafting Phase: Chapter 4-10',
      type: 'critical',
      startDate: '2023-10-17',
      endDate: '2023-10-19',
    },
    {
      id: '2',
      author: 'Sarah J.',
      project: 'Manuscript',
      name: 'Edit Queue',
      type: 'buffer',
      startDate: '2023-10-20',
      endDate: '2023-10-21',
    },
    {
      id: '3',
      author: 'Marcus T.',
      project: 'Research',
      name: 'Worldbuilding Doc (Delayed)',
      type: 'delayed',
      startDate: '2023-10-17',
      endDate: '2023-10-19',
    },
  ];

  const tasks: Task[] = [
    {
      id: '1',
      description: 'Review delayed Research Note #42',
      project: 'Project: Neon Orchard',
      assignee: 'MT Marcus T.',
      assigneeInitials: 'MT',
      impact: 'BLOCKING CHAPTER 5',
      deadline: 'Overdue 2h',
      overdue: true,
    },
    {
      id: '2',
      description: 'Final Proofread for Project Alpha',
      project: 'Project: Alpha',
      assignee: 'SJ Sarah J.',
      assigneeInitials: 'SJ',
      impact: 'MILESTONE GOAL',
      deadline: 'Today, 17:00',
    },
  ];

  const riskAlerts: RiskAlert[] = [
    {
      id: '1',
      type: 'resource',
      severity: 'high',
      title: 'Resource Constraint',
      description: 'Marcus T. is assigned to 4 high-priority tasks simultaneously.',
      actionLink: '#',
      actionText: 'Reassign Tasks',
    },
    {
      id: '2',
      type: 'dependency',
      severity: 'medium',
      title: 'Dependency Risk',
      description: 'Project Alpha: Manuscript delay might push back Editing phase by 3 days.',
      actionLink: '#',
      actionText: 'View Impact Map',
    },
    {
      id: '3',
      type: 'velocity',
      severity: 'low',
      title: 'Velocity Warning',
      description: 'Daily word count trending 15% below target for 3 authors.',
      actionLink: '#',
      actionText: '',
    },
  ];

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'critical':
        return '#ffd700';
      case 'buffer':
        return '#60a5fa';
      case 'delayed':
        return '#f87171';
      default:
        return '#888';
    }
  };

  const getRiskSeverityClass = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'risk-high';
      case 'medium':
        return 'risk-medium';
      case 'low':
        return 'risk-low';
      default:
        return 'risk-low';
    }
  };

  // Calculate timeline dates
  const startDate = new Date('2023-10-16');
  const endDate = new Date('2023-10-23');
  const today = new Date('2023-10-19');
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const getDatePosition = (dateString: string) => {
    const date = new Date(dateString);
    const diffDays = Math.ceil((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (diffDays / days) * 100;
  };

  const todayPosition = getDatePosition('2023-10-19');

  const highRiskCount = riskAlerts.filter((r) => r.severity === 'high').length;

  return (
    <div className="overview-view">
      <div className="timeline-section">
        <div className="timeline-header">
          <h2 className="timeline-title">
            <span className="material-symbols-outlined timeline-icon">view_timeline</span>
            MASTER PROJECT TIMELINE (OCT - NOV)
          </h2>
          <div className="timeline-legend">
            <div className="legend-item">
              <span className="legend-dot critical"></span>
              <span>Critical</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot buffer"></span>
              <span>Buffer</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot delayed"></span>
              <span>Delayed</span>
            </div>
          </div>
          <div className="timeline-controls">
            <button className="icon-btn-small">
              <span className="material-symbols-outlined">search</span>
            </button>
            <button className="icon-btn-small">
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
            <span className="week-label">Week 42</span>
          </div>
        </div>

        <div className="timeline-container">
          <div className="timeline-header-row">
            <div className="timeline-label-column"></div>
            <div className="timeline-dates-row">
              {Array.from({ length: days + 1 }).map((_, i) => {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const isToday = date.toDateString() === today.toDateString();
                return (
                  <div key={i} className={`timeline-date-header ${isToday ? 'today' : ''}`}>
                    {isToday ? 'TODAY' : `OCT ${date.getDate()}`}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="timeline-rows">
            {['Sarah J. - Manuscript', 'Marcus T. - Research'].map((authorName, authorIdx) => {
              const authorTasks = timelineTasks.filter((t) => {
                if (authorIdx === 0) return t.author === 'Sarah J.';
                return t.author === 'Marcus T.';
              });
              
              return (
                <div key={authorIdx} className="timeline-row">
                  <div className="timeline-label-column">
                    <div className="task-author-label">{authorName}</div>
                    <div className="task-project-label">
                      {authorIdx === 0 ? 'Project Alpha' : 'Neon Orchard'}
                    </div>
                  </div>
                  <div className="timeline-bars-container">
                    {authorTasks.map((task, taskIdx) => {
                      const startPos = getDatePosition(task.startDate);
                      const endPos = getDatePosition(task.endDate);
                      const width = endPos - startPos;
                      
                      // Convert percentage to pixel approximation (100px per day)
                      const leftPx = (startPos / 100) * (days * 100);
                      const widthPx = (width / 100) * (days * 100);

                      return (
                        <div
                          key={task.id}
                          className={`task-bar ${task.type}`}
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                          }}
                        >
                          <span className="task-bar-label">{task.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="metrics-bar">
        <div className="metric-item">
          <span className="metric-label">BOTTLENECKS</span>
          <span className="metric-value">
            03
            <span className="material-symbols-outlined metric-icon warning">error</span>
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">CRITICAL PATH HEALTH</span>
          <span className="metric-value">
            92%
            <span className="material-symbols-outlined metric-icon critical">bolt</span>
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">VELOCITY</span>
          <span className="metric-value">
            12.4k
            <span className="metric-unit">words/day</span>
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">ACTIVE AUTHORS</span>
          <span className="metric-value">
            08
            <span className="metric-unit">/ 12 online</span>
          </span>
        </div>
      </div>

      <div className="overview-main">
        <div className="overview-left">
          <div className="tasks-section">
            <div className="section-header">
              <h3 className="section-title">
                <span className="material-symbols-outlined section-icon">priority_high</span>
                HIGH PRIORITY CONSOLIDATED TASK LIST
              </h3>
              <div className="task-filters">
                <button
                  className={`filter-btn ${selectedFilter === 'Urgent' ? 'active' : ''}`}
                  onClick={() => setSelectedFilter('Urgent')}
                >
                  Urgent
                </button>
                <button
                  className={`filter-btn ${selectedFilter === 'Unassigned' ? 'active' : ''}`}
                  onClick={() => setSelectedFilter('Unassigned')}
                >
                  Unassigned
                </button>
                <button
                  className={`filter-btn ${selectedFilter === 'Dependencies' ? 'active' : ''}`}
                  onClick={() => setSelectedFilter('Dependencies')}
                >
                  Dependencies
                </button>
                <button className="icon-btn-small">
                  <span className="material-symbols-outlined">menu</span>
                </button>
              </div>
            </div>

            <div className="tasks-table">
              <div className="table-header">
                <div className="col-description">TASK DESCRIPTION</div>
                <div className="col-assignee">ASSIGNEE</div>
                <div className="col-impact">IMPACT</div>
                <div className="col-deadline">DEADLINE</div>
              </div>
              <div className="table-body">
                {tasks.map((task) => (
                  <div key={task.id} className="table-row">
                    <div className="col-description">
                      <div className="task-status-indicator">
                        <span className={`status-dot ${task.overdue ? 'overdue-pulse' : 'active'}`}></span>
                      </div>
                      <div className="task-desc-content">
                        <div className="task-desc-main">{task.description}</div>
                        <div className="task-desc-sub">{task.project}</div>
                      </div>
                    </div>
                    <div className="col-assignee">
                      <span className="assignee-badge">{task.assigneeInitials}</span>
                      <span className="assignee-name">{task.assignee.replace(/\w+ /, '')}</span>
                    </div>
                    <div className="col-impact">
                      <span className={task.overdue ? 'impact-critical' : 'impact-normal'}>
                        {task.impact.replace(/\s+/g, ' ')}
                      </span>
                    </div>
                    <div className={`col-deadline ${task.overdue ? 'overdue' : ''}`}>
                      {task.deadline}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="overview-right">
          <div className="risk-alerts-section">
            <div className="section-header">
              <h3 className="section-title">
                <span className="material-symbols-outlined section-icon">notification_important</span>
                RISK ALERTS
              </h3>
              {highRiskCount > 0 && (
                <span className="badge-high">{highRiskCount} High</span>
              )}
            </div>

            <div className="risk-alerts-list">
              {riskAlerts.map((risk) => (
                <div key={risk.id} className={`risk-alert ${getRiskSeverityClass(risk.severity)}`}>
                  <div className="risk-title">{risk.title}</div>
                  <div className="risk-description">{risk.description}</div>
                  {risk.actionText && (
                    <button className="risk-action">
                      {risk.actionText}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;