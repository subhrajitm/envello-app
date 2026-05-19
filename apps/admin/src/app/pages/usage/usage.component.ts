import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, UsageRow, UsageSummary } from '../../services/admin.service';

type DateFilter = 'today' | 'week' | 'month';

@Component({
  selector: 'app-usage',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './usage.component.html',
  styleUrl: './usage.component.css',
})
export class UsageComponent implements OnInit {
  private admin = inject(AdminService);

  dateFilter = signal<DateFilter>('week');
  summary = signal<UsageSummary>({ total_requests: 0, total_chars: 0 });
  rows = signal<UsageRow[]>([]);
  providerChart = signal<{ provider: string; count: number; pct: number }[]>([]);
  loading = signal(true);

  async ngOnInit() {
    await this.fetchData();
  }

  async setFilter(f: DateFilter) {
    this.dateFilter.set(f);
    await this.fetchData();
  }

  private async fetchData() {
    this.loading.set(true);
    const filter = this.dateFilter();
    const [summary, rows, chart] = await Promise.all([
      this.admin.loadUsageSummary(filter),
      this.admin.loadUsageByUser(filter),
      this.admin.loadProviderBreakdown(filter),
    ]);
    this.summary.set(summary);
    this.rows.set(rows);
    this.providerChart.set(chart);
    this.loading.set(false);
  }

  exportCsv() {
    const headers = ['User ID', 'Email', 'Provider', 'Model', 'Requests', 'Total Chars', 'Last Active'];
    const csvRows = this.rows().map(r =>
      [r.user_id, r.email, r.provider, r.model, r.requests, r.total_chars, r.last_active].join(',')
    );
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-${this.dateFilter()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatChars(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return String(n);
  }
}
