import React, { useState } from 'react';
import './ProjectOversight.css';

interface Project {
  id: string;
  title: string;
  status: 'DRAFTING' | 'PLANNING' | 'COMPLETE' | 'REVIEW';
  words: string;
  updated: string;
  icon: string;
}

const ProjectOversight: React.FC = () => {
  const [projects] = useState<Project[]>([
    {
      id: '1',
      title: 'Project Alpha: Final Manuscript',
      status: 'DRAFTING',
      words: '48.2k',
      updated: '2m ago',
      icon: 'menu_book',
    },
    {
      id: '2',
      title: 'Neon Orchard Chronicles',
      status: 'PLANNING',
      words: '12.5k',
      updated: '1h ago',
      icon: 'description',
    },
    {
      id: '3',
      title: 'The Scent of Green',
      status: 'COMPLETE',
      words: '82.1k',
      updated: 'Oct 24',
      icon: 'check_circle',
    },
    {
      id: '4',
      title: 'Echoes of the Void',
      status: 'REVIEW',
      words: '35.0k',
      updated: '2d ago',
      icon: 'extension',
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFTING':
        return 'status-yellow';
      case 'PLANNING':
        return 'status-blue';
      case 'COMPLETE':
        return 'status-green';
      case 'REVIEW':
        return 'status-orange';
      default:
        return 'status-gray';
    }
  };

  return (
    <div className="project-oversight">
      <div className="section-header">
        <div className="section-title">
          <span className="material-symbols-outlined section-icon">list</span>
          PROJECT OVERSIGHT
        </div>
        <div className="section-controls">
          <button className="control-btn">All Status</button>
          <button className="control-btn">
            Sort by: Last Updated <span className="material-symbols-outlined filter-icon">expand_more</span>
          </button>
          <button className="control-btn icon-only">
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>
      </div>
      <div className="project-table">
        <div className="table-header">
          <div className="col-title">PROJECT TITLE</div>
          <div className="col-status">STATUS</div>
          <div className="col-words">WORDS</div>
          <div className="col-updated">UPDATED</div>
        </div>
        <div className="table-body">
          {projects.map((project) => (
            <div key={project.id} className="table-row">
              <div className="col-title">
                <span className="material-symbols-outlined project-icon">{project.icon}</span>
                {project.title}
              </div>
              <div className="col-status">
                <span className={`status-badge ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <div className="col-words">{project.words}</div>
              <div className="col-updated">{project.updated}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectOversight;