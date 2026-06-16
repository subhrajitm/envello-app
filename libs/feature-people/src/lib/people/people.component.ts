import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StoreService, RelationshipService, PersonInteraction,
} from '@envello/core';
import { Person } from '@envello/domain';
import { ConfirmDialogComponent, EmptyStateComponent, FeatureSidebarComponent } from '@envello/ui';

type PeopleView = 'grid' | 'profile';

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, EmptyStateComponent, FeatureSidebarComponent],
  templateUrl: './people.component.html',
  styleUrl: './people.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeopleComponent {
  private store       = inject(StoreService);
  readonly relService = inject(RelationshipService);

  view           = signal<PeopleView>('grid');
  searchQuery    = signal('');
  selectedId     = signal<string | null>(null);
  showAddForm    = signal(false);
  generatingInsight = signal(false);
  insight        = signal('');

  // New person form
  newName    = signal('');
  newEmail   = signal('');
  newCompany = signal('');
  newRole    = signal('');

  deleteTarget = signal<Person | null>(null);

  readonly profiles = computed(() => this.relService.peopleWithStats());

  readonly filteredProfiles = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.profiles();
    return this.profiles().filter(p =>
      p.person.name.toLowerCase().includes(q) ||
      p.person.email?.toLowerCase().includes(q) ||
      p.person.company?.toLowerCase().includes(q)
    );
  });

  readonly selectedProfile = computed(() =>
    this.selectedId()
      ? this.profiles().find(p => p.person.id === this.selectedId()) ?? null
      : null
  );

  readonly discoveredPeople = computed(() => this.relService.discoverPeople().slice(0, 10));

  // Sidebar nav items (filter by interaction type)
  readonly sidebarNavItems = computed(() => [
    { id: 'all',      label: 'All People',    icon: 'group',         badge: this.profiles().length },
    { id: 'meetings', label: 'Meeting Contacts', icon: 'calendar_month', badge: this.profiles().filter(p => p.upcomingMeetings > 0).length },
    { id: 'tasks',    label: 'Task Collaborators', icon: 'check_circle',  badge: this.profiles().filter(p => p.openTasks > 0).length },
    { id: 'recent',   label: 'Recently Seen',  icon: 'schedule',      badge: this.recentProfiles().length },
  ]);

  private activeFilter = signal<string>('all');

  readonly displayedProfiles = computed(() => {
    const filter = this.activeFilter();
    const all = this.filteredProfiles();
    switch (filter) {
      case 'meetings': return all.filter(p => p.upcomingMeetings > 0 || p.interactions.some(i => i.type === 'meeting'));
      case 'tasks':    return all.filter(p => p.openTasks > 0);
      case 'recent':   return this.recentProfiles();
      default:         return all;
    }
  });

  private recentProfiles() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return this.filteredProfiles().filter(p => p.lastSeen && new Date(p.lastSeen) >= cutoff);
  }

  onNavItemClick(id: string) {
    this.activeFilter.set(id);
    this.selectedId.set(null);
  }

  selectPerson(id: string) {
    this.selectedId.set(id);
    this.view.set('profile');
    this.insight.set('');
  }

  backToGrid() {
    this.view.set('grid');
    this.selectedId.set(null);
    this.insight.set('');
  }

  openAddForm() { this.showAddForm.set(true); }
  closeAddForm() {
    this.showAddForm.set(false);
    this.newName.set(''); this.newEmail.set('');
    this.newCompany.set(''); this.newRole.set('');
  }

  addPerson() {
    const name = this.newName().trim();
    if (!name) return;
    const person: Person = {
      id: `person-${Date.now()}`,
      name,
      email: this.newEmail().trim() || undefined,
      company: this.newCompany().trim() || undefined,
      role: this.newRole().trim() || undefined,
      createdAt: new Date().toISOString(),
      tags: [],
    };
    this.store.addPerson(person);
    this.closeAddForm();
    this.selectPerson(person.id);
  }

  importPerson(discovered: { name: string; email?: string }) {
    const person = this.relService.importFromAttendee(discovered.name, discovered.email);
    this.selectPerson(person.id);
  }

  confirmDelete(person: Person) { this.deleteTarget.set(person); }

  deletePerson() {
    const p = this.deleteTarget();
    if (!p) return;
    this.store.deletePerson(p.id);
    this.deleteTarget.set(null);
    if (this.selectedId() === p.id) this.backToGrid();
  }

  async generateInsight() {
    const id = this.selectedId();
    if (!id) return;
    this.generatingInsight.set(true);
    this.insight.set('');
    const result = await this.relService.generateInsight(id);
    this.insight.set(result);
    this.generatingInsight.set(false);
  }

  daysSince(date: string | null): string {
    if (!date) return 'Never';
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 7)  return `${d} days ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return `${Math.floor(d / 30)}mo ago`;
  }

  interactionIcon(type: PersonInteraction['type']): string {
    const map: Record<typeof type, string> = {
      meeting: 'calendar_month', task: 'check_circle', note: 'edit_note', transaction: 'receipt_long',
    };
    return map[type];
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  avatarColor(index: number): string {
    const colors = ['#6d28d9','#0284c7','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#16a34a'];
    return colors[index % colors.length];
  }

  trackById(_: number, item: { person: Person }) { return item.person.id; }
  trackByIntId(_: number, i: PersonInteraction) { return i.id; }
}
