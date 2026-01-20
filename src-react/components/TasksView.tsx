import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import './TasksView.css';

const TasksView: React.FC = () => {
    const [selectedFilter, setSelectedFilter] = useState<string>('All');
    const { tasks } = useStore();

    const todayTasks = tasks.filter(t => t.due?.includes('Today')).length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const activeTasks = tasks.filter(t => t.status === 'ACTIVE').length;

    return (
        <div className="tasks-view-minimal">
            <div className="tasks-main-content">
                <div className="tasks-metrics-bar">
                    <div className="tasks-metric-item">
                        <span className="tasks-metric-label">TODAY'S TASKS</span>
                        <span className="tasks-metric-value">
                            {todayTasks}
                            <span className="material-symbols-outlined tasks-metric-icon">event</span>
                        </span>
                    </div>
                    <div className="tasks-metric-item">
                        <span className="tasks-metric-label">COMPLETED</span>
                        <span className="tasks-metric-value">
                            {completedTasks}
                            <span className="tasks-metric-unit">/ {tasks.length} total</span>
                        </span>
                    </div>
                    <div className="tasks-metric-item">
                        <span className="tasks-metric-label">ACTIVE</span>
                        <span className="tasks-metric-value">
                            {activeTasks}
                            <span className="material-symbols-outlined tasks-metric-icon">check_circle</span>
                        </span>
                    </div>
                    <div className="tasks-metric-item">
                        <span className="tasks-metric-label">PRIORITY</span>
                        <span className="tasks-metric-value">
                            {tasks.filter(t => t.priority === 'PRIORITY 01').length}
                            <span className="tasks-metric-unit">high priority</span>
                        </span>
                    </div>
                </div>

                <div className="tasks-main-section">
                    <div className="tasks-section-header">
                        <h3 className="tasks-section-title">
                            <span className="material-symbols-outlined tasks-section-icon">task</span>
                            ALL TASKS
                        </h3>
                        <div className="tasks-section-controls">
                            <button
                                className={`tasks-filter-btn ${selectedFilter === 'All' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('All')}
                            >
                                All
                            </button>
                            <button
                                className={`tasks-filter-btn ${selectedFilter === 'Today' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('Today')}
                            >
                                Today
                            </button>
                            <button
                                className={`tasks-filter-btn ${selectedFilter === 'This Week' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('This Week')}
                            >
                                This Week
                            </button>
                            <button className="tasks-icon-btn">
                                <span className="material-symbols-outlined">filter_list</span>
                            </button>
                        </div>
                    </div>

                    <div className="tasks-detail-table">
                        <div className="tasks-table-header">
                            <div className="tasks-col-task">TASK</div>
                            <div className="tasks-col-project">PROJECT</div>
                            <div className="tasks-col-priority">PRIORITY</div>
                            <div className="tasks-col-time">TIME</div>
                            <div className="tasks-col-due">DUE</div>
                        </div>
                        <div className="tasks-table-body">
                            {tasks.map((task) => (
                                <div key={task.id} className="tasks-table-row">
                                    <div className="tasks-col-task">
                                        <input type="checkbox" className="tasks-table-checkbox" />
                                        <div className="tasks-task-content">
                                            <div className="tasks-task-title">{task.title}</div>
                                        </div>
                                    </div>
                                    <div className="tasks-col-project">{task.project || '—'}</div>
                                    <div className="tasks-col-priority">
                                        <span className={`tasks-priority-badge ${task.priority.toLowerCase().replace(' ', '-')}`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div className="tasks-col-time">{task.hours}</div>
                                    <div className={`tasks-col-due ${task.due?.includes('Overdue') ? 'tasks-overdue' : ''}`}>
                                        {task.due || '—'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="tasks-sidebar">
                <div className="tasks-header-col">
                    <div className="date-nav-minimal">
                        <div className="mn-header">OCT 2023</div>
                        <div className="nav-arrows">
                            <span className="material-symbols-outlined nav-arr">chevron_left</span>
                            <span className="material-symbols-outlined nav-arr">chevron_right</span>
                        </div>
                    </div>

                    <div className="mini-calendar-grid">
                        <div className="cal-days-header">
                            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                        </div>
                        <div className="cal-days-grid">
                            <span className="c-day inactive">22</span>
                            <span className="c-day inactive">23</span>
                            <span className="c-day inactive">24</span>
                            <span className="c-day inactive">25</span>
                            <span className="c-day current">26</span>
                            <span className="c-day">27</span>
                            <span className="c-day">28</span>
                            <span className="c-day">29</span>
                            <span className="c-day">30</span>
                            <span className="c-day">31</span>
                            <span className="c-day active-yellow">12</span> {/* Highlighted in screenshot */}
                            <span className="c-day">1</span>
                            <span className="c-day">2</span>
                            <span className="c-day">3</span>
                        </div>
                    </div>
                </div>

                <div className="global-tasks-feed">
                    <div className="feed-header">
                        <span className="feed-title">GLOBAL TASKS</span>
                        <span className="feed-count">4 ACTIVE</span>
                    </div>

                    <div className="task-group">
                        <div className="group-toggle">
                            <span className="material-symbols-outlined toggle-icon">expand_more</span>
                            <span className="group-label">TODAY</span>
                            <span className="group-count">02</span>
                        </div>
                        <div className="task-items">
                            {tasks.map(task => (
                                <div key={task.id} className="task-card-minimal">
                                    <div className="task-check-box"></div>
                                    <div className="task-min-content">
                                        <div className="task-min-title">{task.title}</div>
                                        <div className="task-min-meta">
                                            <span className="p-badge">{task.priority}</span>
                                            <span className="h-badge">{task.hours}</span>
                                        </div>
                                        {task.id === '2' && (
                                            <div className="sub-meta-time">14:00 — 16:00</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="task-group collapsed">
                        <div className="group-toggle">
                            <span className="material-symbols-outlined toggle-icon">chevron_right</span>
                            <span className="group-label">UPCOMING</span>
                            <span className="group-count">01</span>
                        </div>
                    </div>

                    <div className="task-group collapsed">
                        <div className="group-toggle">
                            <span className="material-symbols-outlined toggle-icon">chevron_right</span>
                            <span className="group-label">NO DUE DATE</span>
                            <span className="group-count">01</span>
                        </div>
                    </div>

                    <div className="new-task-entry">
                        <button className="btn-add-entry">
                            + NEW TASK ENTRY
                        </button>
                        <div className="version-info">V5.0.0-PRO // NANO_BANANA_CORE</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TasksView;
