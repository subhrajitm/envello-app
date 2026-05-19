import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminService, AdminUser } from '../../services/admin.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  private admin = inject(AdminService);

  searchQuery = signal('');
  allUsers = signal<AdminUser[]>([]);
  loading = signal(true);
  toast = signal('');

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

  async makeAdmin(user: AdminUser) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const { error } = await this.admin.updateUserRole(user.id, newRole);
    if (!error) {
      this.allUsers.update(list =>
        list.map(u => u.id === user.id ? { ...u, role: newRole } : u)
      );
      this.toast.set(`${user.full_name} is now ${newRole === 'admin' ? 'an admin' : 'a user'}.`);
    } else {
      this.toast.set(`Error: ${error}`);
    }
    setTimeout(() => this.toast.set(''), 3000);
  }

  async toggleStatus(user: AdminUser) {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const { error } = await this.admin.updateUserStatus(user.id, newStatus);
    if (!error) {
      this.allUsers.update(list =>
        list.map(u => u.id === user.id ? { ...u, status: newStatus } : u)
      );
      this.toast.set(`${user.full_name} ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}.`);
    } else {
      this.toast.set(`Error: ${error}`);
    }
    setTimeout(() => this.toast.set(''), 3000);
  }
}
