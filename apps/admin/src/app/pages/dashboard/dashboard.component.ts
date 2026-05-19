import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private admin = inject(AdminService);

  totalUsers = signal(0);
  aiRequestsToday = signal(0);
  activeFlagCount = signal(0);
  platformProvider = signal('mock');
  recentActivity = signal<{ user_id: string; provider: string; model: string; created_at: string }[]>([]);
  loading = signal(true);

  async ngOnInit() {
    const [stats, activity] = await Promise.all([
      this.admin.loadDashboardStats(),
      this.admin.loadRecentActivity(),
    ]);
    this.totalUsers.set(stats.totalUsers);
    this.aiRequestsToday.set(stats.aiRequestsToday);
    this.activeFlagCount.set(stats.activeFlagCount);
    this.platformProvider.set(stats.platformProvider);
    this.recentActivity.set(activity);
    this.loading.set(false);
  }
}
