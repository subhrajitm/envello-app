import React, { useState } from 'react';
import './OverviewView.css';

const OverviewView: React.FC = () => {
  const [currentMonth] = useState('November 2024');

  // Planning Pool items
  const planingItems = [
    { id: '1', title: 'Emerald Protocol', tag: 'Fiction', stage: 'Draft 2 • 4d left', active: true },
    { id: '2', title: 'Midnight Kyoto', tag: 'Mystery', stage: 'Planning • 12d left', active: false },
  ];

  const globalTasks = [
    'Finalize Ch. 14 outline',
    'Character Bio: Elena',
    'World History Sync'
  ];

  // Mock Calendar Days
  const days = [
    { date: 28, prevMonth: true }, { date: 29, prevMonth: true }, { date: 30, prevMonth: true }, { date: 31, prevMonth: true },
    { date: 1, events: [{ title: 'DRAFT 2 SESSION', time: '09:00 - 11:30', type: 'fiction' }] },
    { date: 2 }, { date: 3 },
    { date: 4 },
    { date: 5, today: true, events: [{ title: 'CHARACTER ARC DUE', type: 'deadline' }, { title: 'EMERALD EDIT', type: 'fiction' }, { title: 'KYOTO BEATS', type: 'mystery' }] },
    { date: 6, hasAdd: true },
    { date: 7 },
    { date: 8, events: [{ title: 'DEEP FOCUS', type: 'fiction' }] },
    { date: 9 }, { date: 10 },
    { date: 11 }, { date: 12 }, { date: 13 },
    { date: 14, events: [{ title: 'KYOTO RELEASE', type: 'deadline' }] },
  ];

  const activities = [
    { id: '1', text: "Entry added to 'Morning Pages'", time: '10 MINS AGO', type: 'entry' },
    { id: '2', text: "Sync complete on 3 devices", time: '1 HOUR AGO', type: 'sync' },
    { id: '3', text: "AI Analysis ready for Chapter 1", time: '4 HOURS AGO', type: 'ai' },
  ];

  return (
    <div className="overview-layout">
      {/* Left Sidebar: Daily Stats & Pool */}
      <div className="ov-sidebar-left">
        <div className="ov-stats-header">DAILY STATS</div>
        <div className="ov-stats-row">
          <div className="stat-card">
            <div className="stat-label">WORD COUNT</div>
            <div className="stat-value">842.5k</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">STREAK</div>
            <div className="stat-value yellow">18d</div>
          </div>
        </div>

        <div className="ov-section-header">
          PLANNING POOL <span className="material-symbols-outlined icon-xs">filter_list</span>
        </div>
        <div className="planning-list">
          {planingItems.map(item => (
            <div key={item.id} className={`planning-card ${item.active ? 'active' : ''}`}>
              <div className="plan-row-top">
                <span className="plan-title">{item.title}</span>
                <span className={`plan-tag ${item.tag.toLowerCase()}`}>{item.tag}</span>
              </div>
              <div className="plan-stage">
                <span className="material-symbols-outlined icon-tiny">drag_indicator</span>
                {item.stage}
              </div>
              {item.active && <div className="active-indicator-bar"></div>}
            </div>
          ))}
        </div>

        <div className="ov-section-header mt-4">GLOBAL TASKS</div>
        <div className="global-tasks-list">
          {globalTasks.map((t, i) => (
            <div key={i} className="g-task-row">
              <span className="material-symbols-outlined icon-xs">target</span>
              {t}
            </div>
          ))}
        </div>

        <button className="show-assets-btn">SHOW ALL ASSETS</button>
      </div>

      {/* Main Content: Calendar */}
      <div className="ov-calendar-area">
        <div className="calendar-header">
          <h2 className="cal-title">{currentMonth}</h2>
          <div className="cal-views">
            <button className="cal-view-btn active">MONTH</button>
            <button className="cal-view-btn">2 WEEKS</button>
          </div>

          <div className="cal-legend">
            <div className="legend-item"><span className="dot blue"></span> FICTION</div>
            <div className="legend-item"><span className="dot purple"></span> MYSTERY</div>
            <div className="legend-item"><span className="dot yellow"></span> DEADLINE</div>
          </div>

          <div className="cal-nav">
            <button className="cal-nav-btn"><span className="material-symbols-outlined">chevron_left</span></button>
            <button className="cal-nav-btn"><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
        </div>

        <div className="calendar-grid">
          {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(d => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}

          {/* Days Grid */}
          {days.map((day, i) => (
            <div key={i} className={`cal-cell ${day.prevMonth ? 'prev-month' : ''}`}>
              <div className="day-num-row">
                <span className={`day-num ${day.today ? 'today' : ''}`}>{day.date}</span>
                {day.today && <span className="today-badge">TODAY</span>}
              </div>
              <div className="day-events">
                {day.events?.map((ev, k) => (
                  <div key={k} className={`cal-event ${ev.type}`}>
                    <div className="ev-title">{ev.title}</div>
                  </div>
                ))}
                {day.hasAdd && (
                  <div className="cal-add-placeholder">
                    <span className="material-symbols-outlined">add_circle</span>
                    DROP TO PLAN
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* Fill empty cells for illustration */}
          <div className="cal-cell"></div>
          <div className="cal-cell"></div>
          <div className="cal-cell"></div>
        </div>
      </div>

      {/* Right Sidebar: Activity */}
      <div className="ov-sidebar-right">
        <div className="ov-section-header">RECENT ACTIVITY</div>
        <div className="activity-list">
          {activities.map(act => (
            <div key={act.id} className="act-item">
              <span className={`act-dot ${act.type}`}></span>
              <div className="act-content">
                <div className="act-text">{act.text}</div>
                <div className="act-time">{act.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="ov-config-panel">
          <div className="config-header">WORKBENCH CONFIG</div>
          <div className="config-row">
            <span>Auto-Schedule Tasks</span>
            <div className="switch-toggle on"></div>
          </div>
        </div>
        <div className="ov-footer-meta">
          <span>V5.2.0-WORKBENCH</span>
          <span>Dynamic Planning Mode Enabled</span>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;