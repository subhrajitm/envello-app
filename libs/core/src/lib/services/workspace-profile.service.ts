import { Injectable, signal, computed, inject } from '@angular/core';
import { WorkspaceProfile } from '@envello/domain';
import { TauriService } from './tauri.service';

@Injectable({ providedIn: 'root' })
export class WorkspaceProfileService {
  private readonly PROFILES_KEY = 'envello_workspace_profiles';
  private readonly ACTIVE_PROFILE_KEY = 'envello_active_profile';
  private tauri = inject(TauriService);

  /** Maximum number of profiles (including the default "All Spaces"). */
  readonly MAX_SPACES = 10;
  canAddSpace = computed(() => this.profiles().length < this.MAX_SPACES);

  private profilesSignal = signal<WorkspaceProfile[]>([]);
  private activeProfileIdSignal = signal<string | null>(null);

  profiles = this.profilesSignal.asReadonly();
  activeProfileId = this.activeProfileIdSignal.asReadonly();
  private _switching = signal(false);
  /** True while the data layer is re-initializing after a profile switch. Read-only externally. */
  switching = this._switching.asReadonly();

  activeProfile = computed(() => {
    const profs = this.profiles();
    const id = this.activeProfileId();
    return profs.find(p => p.id === id) || profs[0];
  });

  constructor() {
    this.initProfiles();
  }

  private initProfiles() {
    const saved = localStorage.getItem(this.PROFILES_KEY);
    let profiles: WorkspaceProfile[] = [];
    if (saved) {
      try { profiles = JSON.parse(saved); } catch (e) {}
    }
    
    if (profiles.length === 0) {
      profiles = [{ 
        id: 'default', 
        name: 'All Spaces',
        color: '#34d399',
        createdAt: new Date().toISOString(), 
        lastAccessed: new Date().toISOString() 
      }];
      localStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
    }
    this.profilesSignal.set(profiles);

    const activeId = localStorage.getItem(this.ACTIVE_PROFILE_KEY);
    if (activeId && profiles.some(p => p.id === activeId)) {
      this.activeProfileIdSignal.set(activeId);
    } else {
      this.activeProfileIdSignal.set(profiles[0].id);
      // Only write the default fallback if no activeId was saved.
      // If there IS a saved activeId that doesn't match any profile yet,
      // preserve it so addProfileWithId() can restore it once profiles are re-synced.
      if (!activeId) {
        localStorage.setItem(this.ACTIVE_PROFILE_KEY, profiles[0].id);
      }
    }
  }

  addProfile(name: string, color?: string) {
    if (!this.canAddSpace()) return;
    const newProfile: WorkspaceProfile = {
      id: crypto.randomUUID(),
      name,
      color: color || '#3b82f6',
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    const updated = [...this.profiles(), newProfile];
    this.profilesSignal.set(updated);
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(updated));
    this.switchProfile(newProfile.id);
  }

  /** Register a profile using a caller-supplied ID (used to keep Project.id === WorkspaceProfile.id). */
  addProfileWithId(id: string, name: string, color?: string, icon?: string) {
    if (id === 'default') return;
    if (this.profiles().some(p => p.id === id)) return;
    // No canAddSpace() check here — this path is used for sync (registering a
    // profile that already exists in the DB on another device). Limit only blocks
    // fresh creation via addProfile().
    const newProfile: WorkspaceProfile = {
      id,
      name,
      color: color || '#3b82f6',
      icon,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    const updated = [...this.profiles(), newProfile];
    this.profilesSignal.set(updated);
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(updated));

    // If this profile was the saved active profile but was missing from the profiles list
    // (e.g. after a wipe/reset), restore it now that it's been re-added.
    // A reload is required so StoreService re-loads data from the correct namespace.
    const savedActiveId = localStorage.getItem(this.ACTIVE_PROFILE_KEY);
    if (savedActiveId === id && this.activeProfileIdSignal() !== id) {
      this.activeProfileIdSignal.set(id);
      window.location.reload();
    }
  }

  switchProfile(id: string) {
    // Guard: no-op if already on this space or a switch is in progress.
    if (this._switching()) return;
    if (id === this.activeProfileId()) return;
    if (!this.profiles().some(p => p.id === id)) return;

    this._switching.set(true);
    this.activeProfileIdSignal.set(id);

    try {
      localStorage.setItem(this.ACTIVE_PROFILE_KEY, id);
      const updated = this.profiles().map(p =>
        p.id === id ? { ...p, lastAccessed: new Date().toISOString() } : p
      );
      this.profilesSignal.set(updated);
      localStorage.setItem(this.PROFILES_KEY, JSON.stringify(updated));
    } catch (e) {
      // localStorage unavailable (private browsing, quota exceeded) — proceed anyway;
      // the signal is updated in memory so the switch still works for this session.
      console.warn('[WorkspaceProfileService] localStorage write failed:', e);
    }

    if (this.tauri.isTauri()) {
      // Desktop (SQLite): event-based reinit — SQLite reopens the correct DB file,
      // dispatches envello:db-ready, StoreService reloads and fires store-loaded.
      const onLoaded = () => {
        clearTimeout(safetyTimer);
        this._switching.set(false);
        window.removeEventListener('envello:store-loaded', onLoaded);
      };
      // Safety net: clear flag after 8 s if store-loaded never fires (DB error etc.).
      const safetyTimer = setTimeout(() => {
        this._switching.set(false);
        window.removeEventListener('envello:store-loaded', onLoaded);
      }, 8000);
      window.addEventListener('envello:store-loaded', onLoaded);
      window.dispatchEvent(new CustomEvent('envello:profile-switched'));
    } else {
      // Web (PouchDB): page reload guarantees clean data isolation.
      // _switching stays true until the reload tears down this Angular instance.
      setTimeout(() => window.location.reload(), 80);
    }
  }

  removeProfile(id: string) {
    if (id === 'default') return;
    const updated = this.profiles().filter(p => p.id !== id);
    this.profilesSignal.set(updated);
    try { localStorage.setItem(this.PROFILES_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    if (this.activeProfileId() === id) {
      this.switchProfile('default');
    }
  }

  updateProfile(id: string, updates: Partial<WorkspaceProfile>) {
    const updated = this.profiles().map(p =>
      p.id === id ? { ...p, ...updates } as WorkspaceProfile : p
    );
    this.profilesSignal.set(updated);
    try { localStorage.setItem(this.PROFILES_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }
}
