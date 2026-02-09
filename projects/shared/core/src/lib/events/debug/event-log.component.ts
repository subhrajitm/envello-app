import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventBus } from '../event-bus.service';

/**
 * Event Log Debug Component
 * Displays real-time event log for development/debugging
 * Only shown in development mode
 */
@Component({
    selector: 'app-event-log',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="event-log">
      <div class="event-log-header">
        <h3>Event Log</h3>
        <div class="event-log-actions">
          <button (click)="logToConsole()" title="Log to console">
            📋
          </button>
          <button (click)="clear()" title="Clear log">
            🗑️
          </button>
          <button (click)="toggle()" title="Toggle visibility">
            {{ isMinimized ? '⬆️' : '⬇️' }}
          </button>
        </div>
      </div>
      
      @if (!isMinimized) {
        <div class="events">
          <div class="event-count">
            {{ events().length }} events (last 100)
          </div>
          
          @for (event of events().slice(-20).reverse(); track event.timestamp) {
            <div class="event">
              <div class="event-header">
                <span class="event-type">{{ event.type }}</span>
                <span class="event-time">{{ formatTime(event.timestamp) }}</span>
              </div>
              <pre class="event-payload">{{ formatPayload(event.payload) }}</pre>
            </div>
          }
          
          @if (events().length === 0) {
            <div class="no-events">No events yet</div>
          }
        </div>
      }
    </div>
  `,
    styles: [`
    .event-log {
      position: fixed;
      bottom: 0;
      right: 0;
      width: 450px;
      max-height: 400px;
      background: #1e1e1e;
      color: #d4d4d4;
      border: 1px solid #3c3c3c;
      border-radius: 8px 0 0 0;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      z-index: 9999;
      box-shadow: -2px -2px 10px rgba(0, 0, 0, 0.3);
    }
    
    .event-log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
      border-radius: 8px 0 0 0;
    }
    
    .event-log-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #cccccc;
    }
    
    .event-log-actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .event-log-actions button {
      background: transparent;
      border: none;
      color: #cccccc;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    .event-log-actions button:hover {
      background: #3c3c3c;
    }
    
    .events {
      max-height: 320px;
      overflow-y: auto;
      padding: 0.5rem;
    }
    
    .event-count {
      padding: 0.5rem;
      color: #858585;
      font-size: 11px;
      text-align: center;
      border-bottom: 1px solid #3c3c3c;
      margin-bottom: 0.5rem;
    }
    
    .event {
      border-bottom: 1px solid #2d2d2d;
      padding: 0.75rem 0.5rem;
      transition: background 0.2s;
    }
    
    .event:hover {
      background: #252526;
    }
    
    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .event-type {
      color: #4ec9b0;
      font-weight: 600;
      font-size: 13px;
    }
    
    .event-time {
      color: #858585;
      font-size: 11px;
    }
    
    .event-payload {
      margin: 0;
      color: #ce9178;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-all;
      background: #252526;
      padding: 0.5rem;
      border-radius: 4px;
      max-height: 100px;
      overflow-y: auto;
    }
    
    .no-events {
      text-align: center;
      padding: 2rem;
      color: #858585;
    }
    
    /* Scrollbar styling */
    .events::-webkit-scrollbar,
    .event-payload::-webkit-scrollbar {
      width: 8px;
    }
    
    .events::-webkit-scrollbar-track,
    .event-payload::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    
    .events::-webkit-scrollbar-thumb,
    .event-payload::-webkit-scrollbar-thumb {
      background: #3c3c3c;
      border-radius: 4px;
    }
    
    .events::-webkit-scrollbar-thumb:hover,
    .event-payload::-webkit-scrollbar-thumb:hover {
      background: #4c4c4c;
    }
  `]
})
export class EventLogComponent {
    private eventBus = inject(EventBus);

    events = this.eventBus.getEventLog();
    isMinimized = false;

    formatTime(timestamp: number): string {
        return new Date(timestamp).toLocaleTimeString();
    }

    formatPayload(payload: any): string {
        try {
            return JSON.stringify(payload, null, 2);
        } catch {
            return String(payload);
        }
    }

    clear(): void {
        this.eventBus.clearLog();
    }

    logToConsole(): void {
        this.eventBus.logEvents();
    }

    toggle(): void {
        this.isMinimized = !this.isMinimized;
    }
}
