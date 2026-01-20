import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-item">
        <span className="material-symbols-outlined footer-icon">local_fire_department</span>
        <span className="footer-label">CURRENT STREAK:</span>
        <span className="footer-value">14 Days</span>
        <div className="streak-indicators">
          <span className="streak-dot active"></span>
          <span className="streak-dot active"></span>
          <span className="streak-dot active"></span>
          <span className="streak-dot"></span>
        </div>
      </div>
      <div className="footer-item">
        <span className="status-dot"></span>
        <span className="footer-label">SYSTEM OPERATIONAL</span>
      </div>
      <div className="footer-item">
        <span className="material-symbols-outlined footer-icon">cloud</span>
        <span className="footer-label">2.4 GB / 50 GB CORPORATE</span>
      </div>
      <div className="footer-item">
        <span className="material-symbols-outlined footer-icon">calendar_today</span>
        <span className="footer-label">Writing Consistency: 89% (Last 30 Days)</span>
      </div>
      <div className="footer-item">
        <span className="footer-label">V5.0-ENTERPRISE PM</span>
        <span className="footer-separator">•</span>
        <span className="footer-label">Session: 04:12:33</span>
      </div>
    </footer>
  );
};

export default Footer;