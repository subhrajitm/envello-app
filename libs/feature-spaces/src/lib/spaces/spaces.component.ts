import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceProfileService, StoreService, WorkspaceProfile } from '@envello/core';
import {
  ButtonComponent,
  ModalComponent,
  BadgeComponent,
  IconButtonComponent,
  ConfirmDialogComponent,
} from '@envello/ui';

@Component({
  selector: 'app-spaces',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    ModalComponent,
    BadgeComponent,
    IconButtonComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './spaces.component.html',
  styleUrl: './spaces.component.css',
})
export class SpacesComponent {
  workspaceService = inject(WorkspaceProfileService);
  private store    = inject(StoreService);

  profiles      = this.workspaceService.profiles;
  activeProfile = this.workspaceService.activeProfile;

  linkedSpace = computed(() => {
    const p = this.detailsProfile();
    return p ? this.store.spaces().find(proj => proj.id === p.id) : null;
  });

  // ── Menu ──────────────────────────────────────────────────────────────────
  menuOpenId = signal<string | null>(null);
  switching  = this.workspaceService.switching;

  toggleMenu(id: string) {
    this.menuOpenId.update(cur => cur === id ? null : id);
  }
  closeMenu() { this.menuOpenId.set(null); }

  // ── Modal state ───────────────────────────────────────────────────────────
  showModal         = signal(false);
  editMode          = signal(false);
  editProfileId     = signal<string | null>(null);
  showDeleteConfirm = signal(false);
  profileToDelete   = signal<WorkspaceProfile | null>(null);
  showDetails       = signal(false);
  detailsProfile    = signal<WorkspaceProfile | null>(null);

  modalStep        = signal<1 | 2>(1);
  selectedTemplate = signal<string>('blank');

  // ── Form ──────────────────────────────────────────────────────────────────
  formName  = signal('');
  formColor = signal('#3b82f6');
  formIcon  = signal('folder');

  readonly colorOptions = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

  readonly spaceTemplates = [
    { id: 'blank',    icon: 'folder',        title: 'Blank Space',    description: 'A clean slate for anything.',             color: '#3b82f6', formIcon: 'folder' },
    { id: 'project',  icon: 'rocket_launch', title: 'Project Space',  description: 'Track tasks, goals and milestones.',       color: '#f07000', formIcon: 'rocket_launch' },
    { id: 'personal', icon: 'person',        title: 'Personal Space', description: 'Notes, journals and personal ideas.',      color: '#8020a8', formIcon: 'person' },
    { id: 'study',    icon: 'school',        title: 'Study Space',    description: 'Research, reading and learning.',          color: '#1c58d8', formIcon: 'school' },
  ];
  readonly iconOptions  = ['folder', 'rocket_launch', 'laptop', 'brush', 'science', 'bolt', 'star', 'flag', 'campaign', 'architecture'];

  // ── Helpers ───────────────────────────────────────────────────────────────
  isActive(id: string)    { return this.activeProfile()?.id === id; }
  isDeletable(id: string) { return id !== 'default' && !this.isActive(id); }

  getInitials(name: string): string {
    if (!name?.trim()) return '?';
    const words = name.trim().split(/\s+/);
    return words.length === 1
      ? words[0].slice(0, 2).toUpperCase()
      : (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  // ── Switch profile ────────────────────────────────────────────────────────
  switchTo(profile: WorkspaceProfile) {
    if (this.isActive(profile.id)) return;
    this.workspaceService.switchProfile(profile.id);
  }

  // ── New modal ─────────────────────────────────────────────────────────────
  openNewModal() {
    this.formName.set(''); this.formColor.set('#3b82f6'); this.formIcon.set('folder');
    this.editMode.set(false); this.editProfileId.set(null);
    this.modalStep.set(1); this.selectedTemplate.set('blank');
    this.showModal.set(true);
  }

  // ── Edit modal ────────────────────────────────────────────────────────────
  openEditModal(profile: WorkspaceProfile) {
    this.formName.set(profile.name);
    this.formColor.set(profile.color || '#3b82f6');
    this.formIcon.set(profile.icon || 'folder');
    this.editMode.set(true); this.editProfileId.set(profile.id);
    this.modalStep.set(2);
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.modalStep.set(1); }

  selectTemplate(id: string) { this.selectedTemplate.set(id); }

  nextStep() {
    const tpl = this.spaceTemplates.find(t => t.id === this.selectedTemplate());
    if (tpl) { this.formColor.set(tpl.color); this.formIcon.set(tpl.formIcon); }
    this.modalStep.set(2);
  }

  saveProfile() {
    const name = this.formName().trim();
    if (!name) return;

    if (this.editMode()) {
      const id = this.editProfileId();
      if (id) {
        this.workspaceService.updateProfile(id, { name, color: this.formColor(), icon: this.formIcon() });
        this.store.updateSpace(id, { title: name, icon: this.formIcon() });
      }
      this.closeModal();
    } else {
      const id = crypto.randomUUID();
      this.store.addSpace({
        id, title: name, status: 'PLANNING', words: 0,
        updated: new Date().toISOString(), icon: this.formIcon(), progress: 0,
        color: this.formColor(),
      });
      this.workspaceService.addProfileWithId(id, name, this.formColor(), this.formIcon());
      this.closeModal();
      this.workspaceService.switchProfile(id);
    }
  }

  // ── Details modal ─────────────────────────────────────────────────────────
  openDetailsModal(profile: WorkspaceProfile) {
    this.detailsProfile.set(profile);
    this.showDetails.set(true);
  }
  closeDetails() { this.showDetails.set(false); this.detailsProfile.set(null); }

  // ── Delete ────────────────────────────────────────────────────────────────
  openDeleteConfirm(profile: WorkspaceProfile) {
    this.profileToDelete.set(profile);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() { this.showDeleteConfirm.set(false); this.profileToDelete.set(null); }

  confirmDelete() {
    const p = this.profileToDelete();
    if (p) {
      this.store.deleteSpace(p.id);
      this.workspaceService.removeProfile(p.id);
      this.cancelDelete();
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.switching())              return;
      if (this.menuOpenId())             this.closeMenu();
      else if (this.showModal())         this.closeModal();
      else if (this.showDetails())       this.closeDetails();
      else if (this.showDeleteConfirm()) this.cancelDelete();
    }
  }
}
