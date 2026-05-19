import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ConfirmDialogComponent } from '@envello/ui';
import { AdminService, AdminUser } from '../../services/admin.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, DatePipe, ConfirmDialogComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  private admin = inject(AdminService);

  searchQuery = signal('');
  allUsers = signal<AdminUser[]>([]);
  loading = signal(true);
  toast = signal<{ text: string; isError: boolean }>({ text: '', isError: false });
  private toastTimer?: ReturnType<typeof setTimeout>;

  // Confirm dialog state
  pendingRole = signal<AdminUser | null>(null);
  pendingStatus = signal<AdminUser | null>(null);

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.allUsers();
    if (!q) return list;
    return list.filter(
      u => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  async ngOnInit() {
    const users = await this.admin.loadUsers();
    this.allUsers.set(users);
    this.loading.set(false);
  }

  // Opens confirm dialog instead of acting immediately
  requestRoleChange(user: AdminUser) { this.pendingRole.set(user); }
  requestStatusChange(user: AdminUser) {
    // Reactivation is non-destructive — no confirmation needed
    if (user.status === 'suspended') { this.executeToggleStatus(user); return; }
    this.pendingStatus.set(user);
  }

  async confirmRoleChange() {
    const user = this.pendingRole();
    this.pendingRole.set(null);
    if (!user) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const { error } = await this.admin.updateUserRole(user.id, newRole);
    if (!error) {
      this.allUsers.update(list => list.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      this.showToast(`${user.full_name || user.email} is now ${newRole === 'admin' ? 'an admin' : 'a regular user'}.`, false);
    } else {
      this.showToast(`Error: ${error}`, true);
    }
  }

  async confirmSuspend() {
    const user = this.pendingStatus();
    this.pendingStatus.set(null);
    if (!user) return;
    await this.executeToggleStatus(user);
  }

  private async executeToggleStatus(user: AdminUser) {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const { error } = await this.admin.updateUserStatus(user.id, newStatus);
    if (!error) {
      this.allUsers.update(list => list.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      this.showToast(`${user.full_name || user.email} ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}.`, false);
    } else {
      this.showToast(`Error: ${error}`, true);
    }
  }

  private showToast(text: string, isError: boolean) {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, isError });
    this.toastTimer = setTimeout(() => this.toast.set({ text: '', isError: false }), isError ? 6000 : 3000);
  }
}
