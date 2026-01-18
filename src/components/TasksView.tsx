import React, { useState } from 'react';
import './TasksView.css';

interface Task {
    id: string;
    title: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    dueDate: string;
    project: string;
    assignee: string;
    tags: string[];
}

const TasksView: React.FC = () => {
    const [filter, setFilter] = useState('All Tasks');
    const [tasks] = useState<Task[]>([
        {
            id: '1',
            title: 'Review Chapter 3 Draft',
            status: 'TODO',
            priority: 'HIGH',
            dueDate: 'Today',
            project: 'Project Alpha',
            assignee: 'Self',
            tags: ['Editing', 'Urgent'],
        },
        {
            id: '2',
            title: 'Research orbital mechanics',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            dueDate: 'Oct 24',
            project: 'Mars Colony',
            assignee: 'Self',
            tags: ['Research'],
        },
        {
            id: '3',
            title: 'Email publisher regarding cover art',
            status: 'BLOCKED',
            priority: 'HIGH',
            dueDate: 'Overdue',
            project: 'The Green Scent',
            assignee: 'Agent',
            tags: ['Admin'],
        },
        {
            id: '4',
            title: 'Update character bio: Elara',
            status: 'DONE',
            priority: 'LOW',
            dueDate: 'Yesterday',
            project: 'Project Alpha',
            assignee: 'Self',
            tags: ['Writing'],
        },
    ]);

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'HIGH': return 'text-red-400';
            case 'MEDIUM': return 'text-orange-400';
            case 'LOW': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusBadge = (s: string) => {
        switch (s) {
            case 'TODO': return 'badge-gray';
            case 'IN_PROGRESS': return 'badge-blue';
            case 'DONE': return 'badge-green';
            case 'BLOCKED': return 'badge-red';
            default: return 'badge-gray';
        }
    };

    return (
        <div className="tasks-view">
            <div className="tasks-sidebar">
                <div className="sidebar-group">
                    <div className="group-title">VIEWS</div>
                    <button className="sidebar-btn active">
                        <span className="material-symbols-outlined">list</span> All Tasks
                    </button>
                    <button className="sidebar-btn">
                        <span className="material-symbols-outlined">today</span> Today
                    </button>
                    <button className="sidebar-btn">
                        <span className="material-symbols-outlined">date_range</span> Upcoming
                    </button>
                </div>
                <div className="sidebar-group">
                    <div className="group-title">PROJECTS</div>
                    <button className="sidebar-btn">Project Alpha</button>
                    <button className="sidebar-btn">Mars Colony</button>
                    <button className="sidebar-btn">The Green Scent</button>
                </div>
            </div>

            <div className="tasks-main">
                <div className="tasks-header">
                    <div className="header-left">
                        <h2>Tasks / All Tasks</h2>
                    </div>
                    <div className="header-right">
                        <button className="btn-primary">+ Add Task</button>
                    </div>
                </div>

                <div className="tasks-container">
                    {/* Kanban Board Layout Simulation for "All Tasks" or List */}
                    <div className="tasks-list-header">
                        <div className="col-check"></div>
                        <div className="col-task">TASK</div>
                        <div className="col-project">PROJECT</div>
                        <div className="col-status">STATUS</div>
                        <div className="col-priority">PRIORITY</div>
                        <div className="col-due">DUE DATE</div>
                    </div>

                    <div className="tasks-list-body">
                        {tasks.map(task => (
                            <div key={task.id} className="task-row">
                                <div className="col-check">
                                    <input type="checkbox" />
                                </div>
                                <div className="col-task">
                                    <span className="task-title">{task.title}</span>
                                    <div className="task-tags">
                                        {task.tags.map(t => <span key={t} className="task-tag">#{t}</span>)}
                                    </div>
                                </div>
                                <div className="col-project">{task.project}</div>
                                <div className="col-status">
                                    <span className={`status-badge ${getStatusBadge(task.status)}`}>{task.status.replace('_', ' ')}</span>
                                </div>
                                <div className="col-priority">
                                    <span className={`priority-flag ${getPriorityColor(task.priority)}`}>
                                        <span className="material-symbols-outlined icon-small">flag</span>
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="col-due">{task.dueDate}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TasksView;
