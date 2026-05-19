import { Component, signal, inject, OnInit } from '@angular/core';
import { AdminService, FeatureFlag } from '../../services/admin.service';

@Component({
  selector: 'app-feature-flags',
  standalone: true,
  imports: [],
  templateUrl: './feature-flags.component.html',
  styleUrl: './feature-flags.component.css',
})
export class FeatureFlagsComponent implements OnInit {
  private admin = inject(AdminService);

  flags = signal<FeatureFlag[]>([]);
  loading = signal(true);
  saving = signal(false);
  toast = signal('');

  async ngOnInit() {
    const data = await this.admin.loadFeatureFlags();
    this.flags.set(data);
    this.loading.set(false);
  }

  toggle(id: string) {
    this.flags.update(list =>
      list.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f)
    );
  }

  async saveAll() {
    this.saving.set(true);
    const { error } = await this.admin.saveFeatureFlags(this.flags());
    this.saving.set(false);
    this.toast.set(error ? `Error: ${error}` : 'Feature flags saved.');
    setTimeout(() => this.toast.set(''), 3000);
  }
}
