import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, AuditEntry } from '../../services/admin.service';

const ACTION_LABELS: Record<string, { label: string; icon: string; cls: string }> = {
  role_change:       { label: 'Role Change',       icon: 'admin_panel_settings', cls: 'action-role' },
  status_change:     { label: 'Status Change',      icon: 'block',                cls: 'action-status' },
  ai_config_update:  { label: 'AI Config Updated',  icon: 'auto_awesome',         cls: 'action-ai' },
  flag_update:       { label: 'Flag Update',         icon: 'toggle_on',            cls: 'action-flag' },
};

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="audit-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Audit Log</h2>
          <span class="page-subtitle">All admin actions — role changes, config updates, flag toggles</span>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading audit log…</div>
      } @else if (entries().length === 0) {
        <div class="empty-state">
          <span class="material-symbols-outlined empty-icon">history</span>
          <p>No audit entries yet. Actions taken in the admin panel will appear here.</p>
        </div>
      } @else {
        <div class="log-card">
          <table class="log-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Admin</th>
                <th>Details</th>
                <th>Target ID</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry.id) {
                <tr>
                  <td>
                    <div class="action-cell">
                      <span class="action-badge {{ meta(entry.action).cls }}">
                        <span class="material-symbols-outlined">{{ meta(entry.action).icon }}</span>
                        {{ meta(entry.action).label }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="email-cell">{{ entry.admin_email || entry.admin_id || '—' }}</span>
                  </td>
                  <td>
                    <span class="details-cell">{{ entry.details || '—' }}</span>
                  </td>
                  <td>
                    <span class="id-cell" [title]="entry.target_id ?? ''">
                      {{ entry.target_id ? (entry.target_id | slice:0:8) + '…' : '—' }}
                    </span>
                  </td>
                  <td>
                    <span class="time-cell">{{ entry.created_at | date:'MMM d, y, h:mm a' }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="table-footer">
          <span class="footer-text">Showing last {{ entries().length }} entries</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .audit-page { display: flex; flex-direction: column; gap: 20px; }

    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }

    .page-title { font-size: 20px; font-weight: 600; color: var(--text-primary); }
    .page-subtitle { font-size: 13px; color: var(--text-tertiary); display: block; }

    .loading-state { color: var(--text-tertiary); font-size: 13px; padding: 32px 0; text-align: center; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 0; color: var(--text-tertiary);
    }
    .empty-icon { font-size: 40px; opacity: 0.4; }
    .empty-state p { font-size: 13px; text-align: center; max-width: 340px; }

    .log-card {
      background: var(--bg-panel); border: 1px solid var(--border-subtle);
      border-radius: 12px; overflow: hidden;
    }

    .log-table { width: 100%; border-collapse: collapse; }

    .log-table th {
      text-align: left; padding: 12px 16px;
      font-size: 11.5px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-tertiary);
      border-bottom: 1px solid var(--border-subtle);
    }

    .log-table td {
      padding: 12px 16px; font-size: 13px;
      color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle);
      vertical-align: middle;
    }
    .log-table tr:last-child td { border-bottom: none; }
    .log-table tbody tr:hover { background: var(--bg-hover); }

    .action-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 9px; border-radius: 20px;
      font-size: 11.5px; font-weight: 500;
    }
    .action-badge .material-symbols-outlined { font-size: 13px; }

    .action-role   { background: var(--accent-primary-dim); color: var(--accent-primary); }
    .action-status { background: rgba(248,113,113,0.12); color: var(--accent-red); }
    .action-ai     { background: rgba(251,191,36,0.12); color: #f59e0b; }
    .action-flag   { background: rgba(74,222,128,0.12); color: var(--accent-green); }

    .email-cell { font-size: 12px; color: var(--text-secondary); }
    .details-cell { font-size: 12px; color: var(--text-secondary); font-family: var(--font-mono, monospace); }
    .id-cell { font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono, monospace); }
    .time-cell { font-size: 12px; color: var(--text-tertiary); white-space: nowrap; }

    .table-footer { padding: 8px 0; }
    .footer-text { font-size: 12px; color: var(--text-tertiary); }
  `]
})
export class AuditLogComponent implements OnInit {
  private admin = inject(AdminService);

  entries = signal<AuditEntry[]>([]);
  loading = signal(true);

  async ngOnInit() {
    const data = await this.admin.loadAuditLog(200);
    this.entries.set(data);
    this.loading.set(false);
  }

  meta(action: string) {
    return ACTION_LABELS[action] ?? { label: action, icon: 'info', cls: '' };
  }
}
