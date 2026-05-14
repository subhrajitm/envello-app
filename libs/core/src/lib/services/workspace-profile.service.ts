import { Injectable, signal, computed } from '@angular/core';
import { WorkspaceProfile } from '@envello/domain';

@Injectable({ providedIn: 'root' })
export class WorkspaceProfileService {
  private readonly PROFILES_KEY = 'envello_workspace_profiles';
  private readonly ACTIVE_PROFILE_KEY = 'envello_active_profile';

  private profilesSignal = signal<WorkspaceProfile[]>([]);
  private activeProfileIdSignal = signal<string | null>(null);

  profiles = this.profilesSignal.asReadonly();
  activeProfileId = this.activeProfileIdSignal.asReadonly();
  
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
        name: 'All Projects',
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
      localStorage.setItem(this.ACTIVE_PROFILE_KEY, profiles[0].id);
    }
  }

  addProfile(name: string, color?: string) {
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

  switchProfile(id: string) {
    if (this.profiles().some(p => p.id === id)) {
      this.activeProfileIdSignal.set(id);
      localStorage.setItem(this.ACTIVE_PROFILE_KEY, id);
      
      // Update last accessed
      const updated = this.profiles().map(p => 
        p.id === id ? { ...p, lastAccessed: new Date().toISOString() } : p
      );
      this.profilesSignal.set(updated);
      localStorage.setItem(this.PROFILES_KEY, JSON.stringify(updated));

      // Hard reload to isolate databases safely
      window.location.reload();
    }
  }

  removeProfile(id: string) {
    if (id === 'default') return; // protect default
    
    const updated = this.profiles().filter(p => p.id !== id);
    this.profilesSignal.set(updated);
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(updated));
    
    if (this.activeProfileId() === id) {
      this.switchProfile('default');
    }
  }

  updateProfile(id: string, updates: Partial<WorkspaceProfile>) {
    const updated = this.profiles().map(p => {
      if (p.id === id) {
        return { ...p, ...updates } as WorkspaceProfile;
      }
      return p;
    });
    this.profilesSignal.set(updated);
    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(updated));
  }
}
