import { Component, computed, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  StoreService, RelationshipService, PersonInteraction,
  ContactsImportService, ImportPreview, ImportedContact, NotificationService,
} from '@envello/core';
import { Person, RelationshipType } from '@envello/domain';
import {
  ConfirmDialogComponent, EmptyStateComponent, FeatureSidebarComponent,
  TableComponent, SliderPanelComponent, BadgeComponent, ChipComponent,
  type BadgeVariant,
} from '@envello/ui';
import type { EnvTableColumn, EnvTableAction, EnvTableActionEvent } from '@envello/ui';

type PeopleFilter = 'all' | 'birthday' | 'followup' | 'lostouch' | 'meetings' | 'tasks' | 'recent';
type ViewMode = 'table' | 'grid';

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [
    CommonModule, ConfirmDialogComponent, EmptyStateComponent,
    FeatureSidebarComponent, TableComponent, SliderPanelComponent,
    BadgeComponent, ChipComponent,
  ],
  templateUrl: './people.component.html',
  styleUrl: './people.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeopleComponent implements OnInit {
  private store         = inject(StoreService);
  readonly relService   = inject(RelationshipService);
  private importService = inject(ContactsImportService);
  private notify        = inject(NotificationService);
  private _reminderTimeouts: ReturnType<typeof setTimeout>[] = [];

  // ── View state ──────────────────────────────────────────────────────────────
  activeFilter  = signal<PeopleFilter>('all');
  viewMode      = signal<ViewMode>('table');
  searchQuery   = signal('');

  // ── Slider (person profile) ─────────────────────────────────────────────────
  showSlider    = signal(false);
  selectedId    = signal<string | null>(null);

  // ── Add / Edit mode (shared fields — never active simultaneously) ────────────
  addMode       = signal(false);
  editMode      = signal(false);
  editName      = signal('');
  editEmail     = signal('');
  editPhone     = signal('');
  editCompany   = signal('');
  editRole      = signal('');
  editNotes     = signal('');
  editTagInput  = signal('');
  editTags      = signal<string[]>([]);
  // CRM edit fields
  editBirthday      = signal('');
  editReminderDate  = signal('');
  editRelType       = signal('');
  editLocation      = signal('');
  editLinkedin      = signal('');
  editTwitter       = signal('');
  editWebsite       = signal('');
  logContactDone    = signal(false);

  // ── Bulk selection ──────────────────────────────────────────────────────────
  selectedPeople  = signal<Set<string>>(new Set());
  bulkActionMode  = computed(() => this.selectedPeople().size > 0);
  bulkDeleteModalOpen = signal(false);

  // ── Delete ──────────────────────────────────────────────────────────────────
  deleteTarget  = signal<Person | null>(null);

  // ── AI insight ──────────────────────────────────────────────────────────────
  generatingInsight = signal(false);
  insight           = signal('');

  // ── Import ──────────────────────────────────────────────────────────────────
  importLoading    = signal(false);
  importPreviewing = signal(false);
  importPreview    = signal<ImportPreview | null>(null);
  importSelected   = signal<Set<number>>(new Set());
  importDone       = signal(0);

  // ── Computed ────────────────────────────────────────────────────────────────

  readonly profiles = computed(() => this.relService.peopleWithStats());

  readonly filteredProfiles = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const filter = this.activeFilter();
    const all = this.profiles();
    const today = new Date();
    const cutoff30 = new Date(today); cutoff30.setDate(today.getDate() - 30);

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const byFilter = (() => {
      switch (filter) {
        case 'birthday':  return all.filter(p => { const b = this.birthdayInfo(p.person.birthday); return b !== null && b.days <= 14; });
        case 'followup':  return all.filter(p => p.person.reminderDate && new Date(p.person.reminderDate) <= todayStart);
        case 'lostouch':  return all.filter(p => {
          const last = p.person.lastContacted ?? p.lastSeen;
          if (!last) return true;
          return (Date.now() - new Date(last).getTime()) > 60 * 86_400_000;
        });
        case 'meetings':  return all.filter(p => p.interactions.some(i => i.type === 'meeting'));
        case 'tasks':     return all.filter(p => p.openTasks > 0);
        case 'recent':    return all.filter(p => p.lastSeen && new Date(p.lastSeen) >= cutoff30);
        default:          return all;
      }
    })();

    if (!q) return byFilter;
    return byFilter.filter(p =>
      p.person.name.toLowerCase().includes(q) ||
      p.person.email?.toLowerCase().includes(q) ||
      p.person.phone?.toLowerCase().includes(q) ||
      p.person.company?.toLowerCase().includes(q) ||
      p.person.role?.toLowerCase().includes(q)
    );
  });

  readonly selectedProfile = computed(() =>
    this.selectedId() ? this.profiles().find(p => p.person.id === this.selectedId()) ?? null : null
  );

  readonly discoveredPeople = computed(() => this.relService.discoverPeople().slice(0, 8));

  readonly sidebarNavItems = computed(() => {
    const all = this.profiles();
    const today = new Date();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const cutoff30 = new Date(today); cutoff30.setDate(today.getDate() - 30);
    return [
      { id: 'all',      label: 'All People',       icon: 'group',                    count: all.length },
      { id: 'birthday', label: 'Birthday Soon',    icon: 'cake',                     count: all.filter(p => { const b = this.birthdayInfo(p.person.birthday); return b !== null && b.days <= 14; }).length },
      { id: 'followup', label: 'Follow Up',        icon: 'notification_important',   count: all.filter(p => p.person.reminderDate && new Date(p.person.reminderDate) <= todayStart).length },
      { id: 'lostouch', label: 'Lost Touch',       icon: 'person_off',               count: all.filter(p => { const l = p.person.lastContacted ?? p.lastSeen; return !l || (Date.now() - new Date(l).getTime()) > 60 * 86_400_000; }).length },
      { id: 'meetings', label: 'Meeting Contacts', icon: 'calendar_month',           count: all.filter(p => p.interactions.some(i => i.type === 'meeting')).length },
      { id: 'tasks',    label: 'Collaborators',    icon: 'check_circle',             count: all.filter(p => p.openTasks > 0).length },
      { id: 'recent',   label: 'Recently Seen',    icon: 'schedule',                 count: all.filter(p => p.lastSeen && new Date(p.lastSeen) >= cutoff30).length },
    ];
  });

  // ── Table config ────────────────────────────────────────────────────────────

  readonly tableColumns: EnvTableColumn[] = [
    { key: 'name',         header: 'Name',         type: 'avatar-text', sortable: true },
    { key: 'email',        header: 'Email',         sortable: true },
    { key: 'company',      header: 'Company',       sortable: true },
    { key: 'role',         header: 'Role' },
    { key: 'interactions', header: 'Interactions',  sortable: true },
    { key: 'lastSeen',     header: 'Last seen',     sortable: true },
  ];

  readonly tableActions: EnvTableAction[] = [
    { key: 'view',        label: 'View profile', icon: 'person', bulk: false },
    { key: 'delete',      label: 'Delete',       icon: 'delete', danger: true, bulk: false },
    { key: 'bulkDelete',  label: 'Delete',       icon: 'delete', danger: true, bulkOnly: true },
  ];

  readonly tableRows = computed(() =>
    this.filteredProfiles().map(profile => ({
      id: profile.person.id,
      name: { name: profile.person.name, avatar: profile.person.avatar ?? null },
      email:        profile.person.email    ?? '—',
      company:      profile.person.company  ?? '—',
      role:         profile.person.role     ?? '—',
      interactions: profile.totalInteractions,
      lastSeen:     this.daysSince(profile.lastSeen),
      _profile:     profile,
    }))
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  onNavItemClick(id: string) {
    this.activeFilter.set(id as PeopleFilter);
  }

  handleTableAction(event: EnvTableActionEvent) {
    const id = event.row['id'] as string;
    if (event.actionKey === 'view') {
      this.openProfile(id);
    } else if (event.actionKey === 'delete') {
      const person = this.store.people().find(p => p.id === id);
      if (person) this.deleteTarget.set(person);
    }
  }

  handleBulkAction(event: { selectedIds: Set<unknown>; actionKey: string }) {
    const ids = event.selectedIds as Set<string>;
    this.selectedPeople.set(ids);
    if (event.actionKey === 'bulkDelete') {
      this.bulkDeleteModalOpen.set(true);
    }
  }

  confirmBulkDelete() {
    this.selectedPeople().forEach(id => this.store.deletePerson(id));
    this.selectedPeople.set(new Set());
    this.bulkDeleteModalOpen.set(false);
  }

  cancelBulkDelete() {
    this.bulkDeleteModalOpen.set(false);
  }

  clearBulkSelection() {
    this.selectedPeople.set(new Set());
  }

  openProfile(id: string) {
    this.selectedId.set(id);
    this.insight.set('');
    this.showSlider.set(true);
  }

  closeSlider() {
    this.showSlider.set(false);
    this.selectedId.set(null);
    this.insight.set('');
    this.editMode.set(false);
    this.addMode.set(false);
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  openEdit() {
    const p = this.selectedProfile()?.person;
    if (!p) return;
    this.editName.set(p.name);
    this.editEmail.set(p.email ?? '');
    this.editPhone.set(p.phone ?? '');
    this.editCompany.set(p.company ?? '');
    this.editRole.set(p.role ?? '');
    this.editNotes.set(p.notes ?? '');
    this.editTags.set([...(p.tags ?? [])]);
    this.editTagInput.set('');
    this.editBirthday.set(p.birthday ?? '');
    this.editReminderDate.set(p.reminderDate ?? '');
    this.editRelType.set(p.relationshipType ?? '');
    this.editLocation.set(p.location ?? '');
    this.editLinkedin.set(p.socialLinks?.linkedin ?? '');
    this.editTwitter.set(p.socialLinks?.twitter ?? '');
    this.editWebsite.set(p.socialLinks?.website ?? '');
    this.editMode.set(true);
  }

  cancelEdit() {
    this.editMode.set(false);
    this.editTagInput.set('');
  }

  saveEdit() {
    const id = this.selectedId();
    if (!id || !this.editName().trim()) return;
    const sl = { linkedin: this.editLinkedin().trim() || undefined, twitter: this.editTwitter().trim() || undefined, website: this.editWebsite().trim() || undefined };
    this.store.updatePerson(id, {
      name:             this.editName().trim(),
      email:            this.editEmail().trim()        || undefined,
      phone:            this.editPhone().trim()        || undefined,
      company:          this.editCompany().trim()      || undefined,
      role:             this.editRole().trim()         || undefined,
      notes:            this.editNotes().trim()        || undefined,
      tags:             this.editTags(),
      birthday:         this.editBirthday().trim()     || undefined,
      reminderDate:     this.editReminderDate().trim() || undefined,
      relationshipType: (this.editRelType() as RelationshipType) || undefined,
      location:         this.editLocation().trim()     || undefined,
      socialLinks:      (sl.linkedin || sl.twitter || sl.website) ? sl : undefined,
    });
    this.editMode.set(false);
  }

  addEditTag() {
    const tag = this.editTagInput().trim();
    if (!tag || this.editTags().includes(tag)) { this.editTagInput.set(''); return; }
    this.editTags.update(ts => [...ts, tag]);
    this.editTagInput.set('');
  }

  removeEditTag(tag: string) {
    this.editTags.update(ts => ts.filter(t => t !== tag));
  }

  // ── Add person ──────────────────────────────────────────────────────────────

  openAddForm() {
    this.editName.set('');
    this.editEmail.set('');
    this.editPhone.set('');
    this.editCompany.set('');
    this.editRole.set('');
    this.editNotes.set('');
    this.editTags.set([]);
    this.editTagInput.set('');
    this.editBirthday.set('');
    this.editReminderDate.set('');
    this.editRelType.set('');
    this.editLocation.set('');
    this.editLinkedin.set('');
    this.editTwitter.set('');
    this.editWebsite.set('');
    this.addMode.set(true);
    this.editMode.set(false);
    this.selectedId.set(null);
    this.insight.set('');
    this.showSlider.set(true);
  }

  addPerson() {
    const name = this.editName().trim();
    if (!name) return;
    const sl = { linkedin: this.editLinkedin().trim() || undefined, twitter: this.editTwitter().trim() || undefined, website: this.editWebsite().trim() || undefined };
    const person: Person = {
      id: `person-${crypto.randomUUID()}`,
      name,
      email:            this.editEmail().trim()        || undefined,
      phone:            this.editPhone().trim()        || undefined,
      company:          this.editCompany().trim()      || undefined,
      role:             this.editRole().trim()         || undefined,
      notes:            this.editNotes().trim()        || undefined,
      tags:             this.editTags(),
      birthday:         this.editBirthday().trim()     || undefined,
      reminderDate:     this.editReminderDate().trim() || undefined,
      relationshipType: (this.editRelType() as RelationshipType) || undefined,
      location:         this.editLocation().trim()     || undefined,
      socialLinks:      (sl.linkedin || sl.twitter || sl.website) ? sl : undefined,
      createdAt: new Date().toISOString(),
    };
    this.store.addPerson(person);
    this.addMode.set(false);
    this.openProfile(person.id);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  confirmDelete(person: Person) { this.deleteTarget.set(person); }

  deletePerson() {
    const p = this.deleteTarget();
    if (!p) return;
    this.store.deletePerson(p.id);
    this.deleteTarget.set(null);
    if (this.selectedId() === p.id) this.closeSlider();
  }

  // ── Log Contact ─────────────────────────────────────────────────────────────

  logContact() {
    const id = this.selectedId();
    if (!id) return;
    this.store.updatePerson(id, { lastContacted: new Date().toISOString() });
    this.logContactDone.set(true);
    setTimeout(() => this.logContactDone.set(false), 2500);
  }

  // ── AI Insight ──────────────────────────────────────────────────────────────

  async generateInsight() {
    const id = this.selectedId();
    if (!id) return;
    this.generatingInsight.set(true);
    this.insight.set('');
    const result = await this.relService.generateInsight(id);
    this.insight.set(result);
    this.generatingInsight.set(false);
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async startImport() {
    this.importLoading.set(true);
    try {
      const preview = await this.importService.pickAndParse();
      if (!preview) return;
      const knownNames = new Set(this.store.people().map(p => p.name.toLowerCase()));
      preview.duplicates = preview.contacts.filter(c => knownNames.has(c.name.toLowerCase())).length;
      const sel = new Set<number>();
      preview.contacts.forEach((c, i) => { if (!knownNames.has(c.name.toLowerCase())) sel.add(i); });
      this.importSelected.set(sel);
      this.importPreview.set(preview);
      this.importPreviewing.set(true);
      this.importDone.set(0);
    } finally {
      this.importLoading.set(false);
    }
  }

  toggleImportContact(index: number) {
    const sel = new Set(this.importSelected());
    if (sel.has(index)) sel.delete(index); else sel.add(index);
    this.importSelected.set(sel);
  }

  confirmImport() {
    const preview = this.importPreview();
    if (!preview) return;
    const knownNames = new Set(this.store.people().map(p => p.name.toLowerCase()));
    const selected = preview.contacts.filter((_, i) => this.importSelected().has(i));
    const persons = this.importService.toPersons(selected, knownNames);
    persons.forEach(p => this.store.addPerson(p));
    this.importDone.set(persons.length);
    setTimeout(() => this.closeImport(), 1800);
  }

  closeImport() {
    this.importPreviewing.set(false);
    this.importPreview.set(null);
    this.importSelected.set(new Set());
    this.importDone.set(0);
  }

  importPerson(discovered: { name: string; email?: string }) {
    const person = this.relService.importFromAttendee(discovered.name, discovered.email);
    this.openProfile(person.id);
  }

  isKnown(contact: ImportedContact): boolean {
    return this.store.people().some(p => p.name.toLowerCase() === contact.name.toLowerCase());
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit() {
    this._scheduleAllPeopleReminders();
  }

  private _scheduleAllPeopleReminders() {
    const now = Date.now();
    for (const person of this.store.people()) {
      // Follow-up reminder
      if (person.reminderDate) {
        const ms = new Date(person.reminderDate).getTime() - now;
        if (ms > 0) {
          this._reminderTimeouts.push(setTimeout(() => {
            this.notify.info('Follow-up reminder', `Time to follow up with ${person.name}.`);
          }, ms));
        }
      }
      // Birthday reminder (this year or next)
      if (person.birthday) {
        const bday = this._nextBirthdayMs(person.birthday);
        if (bday > 0) {
          this._reminderTimeouts.push(setTimeout(() => {
            this.notify.info("Birthday today! 🎂", `${person.name}'s birthday is today.`);
          }, bday));
        }
      }
    }
  }

  private _nextBirthdayMs(birthday: string): number {
    const today = new Date();
    const parts = birthday.split('-');
    const month = parseInt(parts[1] ?? '1', 10) - 1;
    const day   = parseInt(parts[2] ?? '1', 10);
    let next = new Date(today.getFullYear(), month, day, 9, 0, 0);
    if (next.getTime() <= Date.now()) next.setFullYear(next.getFullYear() + 1);
    return next.getTime() - Date.now();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  daysSince(date: string | null): string {
    if (!date) return 'Never';
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 7)   return `${d}d ago`;
    if (d < 30)  return `${Math.floor(d / 7)}w ago`;
    return `${Math.floor(d / 30)}mo ago`;
  }

  interactionIcon(type: PersonInteraction['type']): string {
    const map: Record<typeof type, string> = {
      meeting: 'calendar_month', task: 'check_circle',
      note: 'edit_note', transaction: 'receipt_long',
    };
    return map[type];
  }

  interactionVariant(type: PersonInteraction['type']): BadgeVariant {
    const map: Record<typeof type, BadgeVariant> = {
      meeting: 'info', task: 'warning', note: 'success', transaction: 'error',
    };
    return map[type] ?? 'default';
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  avatarColor(index: number): string {
    const colors = ['#6d28d9','#0284c7','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#16a34a'];
    return colors[index % colors.length];
  }

  profileIndex(): number {
    return this.profiles().findIndex(p => p.person.id === this.selectedId());
  }

  // ── CRM helpers ──────────────────────────────────────────────────────────────

  birthdayInfo(birthday?: string): { days: number; label: string; today: boolean } | null {
    if (!birthday) return null;
    const parts = birthday.split('-');
    let month: number, day: number;
    if (parts.length === 3) { month = +parts[1] - 1; day = +parts[2]; }
    else if (parts.length === 2) { month = +parts[0] - 1; day = +parts[1]; }
    else return null;
    if (isNaN(month) || isNaN(day)) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const next = new Date(today.getFullYear(), month, day);
    if (next.getTime() < today.getTime()) next.setFullYear(today.getFullYear() + 1);
    const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
    if (days === 0) return { days: 0, label: 'Today! 🎂', today: true };
    if (days === 1) return { days: 1, label: 'Tomorrow', today: false };
    if (days <= 7)  return { days, label: `In ${days} days`, today: false };
    return { days, label: `In ${days} days`, today: false };
  }

  birthdayDisplay(birthday?: string): string {
    if (!birthday) return '';
    const d = new Date(birthday + (birthday.length === 5 ? '/2000' : ''));
    if (isNaN(d.getTime())) return birthday;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  reminderInfo(reminderDate?: string): { label: string; overdue: boolean } | null {
    if (!reminderDate) return null;
    const d = new Date(reminderDate); d.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (days < 0)  return { label: `Overdue by ${-days}d`, overdue: true };
    if (days === 0) return { label: 'Due today', overdue: true };
    if (days === 1) return { label: 'Due tomorrow', overdue: false };
    return { label: `In ${days} days`, overdue: false };
  }

  lastContactedDisplay(person: Person, lastSeen: string | null): string {
    const raw = person.lastContacted ?? lastSeen;
    return this.daysSince(raw);
  }

  relTypeLabel(type?: string): string {
    const map: Record<string, string> = { friend: 'Friend', colleague: 'Colleague', client: 'Client', family: 'Family', mentor: 'Mentor', acquaintance: 'Acquaintance' };
    return map[type ?? ''] ?? '';
  }

  relTypeIcon(type?: string): string {
    const map: Record<string, string> = { friend: 'favorite', colleague: 'work', client: 'handshake', family: 'family_restroom', mentor: 'school', acquaintance: 'person' };
    return map[type ?? ''] ?? 'person';
  }

  readonly relTypeOptions: RelationshipType[] = ['friend', 'colleague', 'client', 'family', 'mentor', 'acquaintance'];
}
