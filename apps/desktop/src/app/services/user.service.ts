import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { SupabaseService } from '../core/services/supabase.service';
import { AuthService } from '../core/services/auth.service';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: string;
  joinedDate: Date;
  preferences: {
    emailNotifications: boolean;
    weeklyDigest: boolean;
    autoBackup: boolean;
    autoSchedule: boolean;
    gender?: 'male' | 'female';
  };
  stats: {
    totalWords: number;
    totalDocuments: number;
    totalProjects: number;
    daysActive: number;
    currentStreak: number;
    lastLoginDate: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  private currentUser = signal<UserProfile | null>(null);

  // Public read-only signals
  user = this.currentUser.asReadonly();

  // Computed values
  isLoggedIn = computed(() => !!this.currentUser());
  userName = computed(() => this.currentUser()?.name || 'Guest');
  userInitials = computed(() => {
    const profile = this.currentUser();
    const authUser = this.authService.currentUser();

    const name = profile?.name || authUser?.user_metadata?.['full_name'] || authUser?.user_metadata?.['name'];
    const email = profile?.email || authUser?.email;
    const identifier = name || email || 'Guest';

    // If name exists, take initials
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
      }
    }
    // Fallback to first 2 chars of identifier
    return identifier.substring(0, 2).toUpperCase();
  });

  constructor() {
    // React to Auth Changes
    effect(() => {
      const authUser = this.authService.currentUser();
      if (authUser) {
        this.loadProfile(authUser);
      } else {
        this.initializeGuestUser();
      }
    });
  }

  private async loadProfile(authUser: User) {
    try {
      const { data, error } = await this.supabase.from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = JSON object not found (no profile yet)
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        // Map Supabase profile to UserProfile
        const profile: UserProfile = {
          id: data.id,
          name: data.full_name || authUser.email?.split('@')[0] || 'User',
          email: data.email || authUser.email!,
          avatar: data.avatar_url,
          bio: data.bio,
          role: data.role || 'Writer',
          joinedDate: new Date(data.joined_at || authUser.created_at),
          preferences: data.preferences || {
            emailNotifications: true,
            weeklyDigest: false,
            autoBackup: true,
            autoSchedule: false
          },
          stats: data.stats || {
            totalWords: 0,
            totalDocuments: 0,
            totalProjects: 0,
            daysActive: 0,
            currentStreak: 0,
            lastLoginDate: new Date().toISOString()
          }
        };
        this.currentUser.set(profile);
        this.checkStreak(profile);
      } else {
        // Create default profile if none exists
        await this.createProfile(authUser);
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    }
  }

  private async createProfile(authUser: User) {
    const newProfile: Partial<UserProfile> = {
      id: authUser.id,
      name: authUser.user_metadata?.['full_name'] || authUser.email?.split('@')[0] || 'User',
      email: authUser.email!,
      role: 'Writer',
      joinedDate: new Date(),
      preferences: {
        emailNotifications: true,
        weeklyDigest: false,
        autoBackup: true,
        autoSchedule: false,
        gender: 'male' // Default
      },
      stats: {
        totalWords: 0,
        totalDocuments: 0,
        totalProjects: 0,
        daysActive: 1,
        currentStreak: 1,
        lastLoginDate: new Date().toISOString()
      }
    };

    // DB Insert
    const { error } = await this.supabase.from('profiles').insert({
      id: newProfile.id,
      email: newProfile.email,
      full_name: newProfile.name,
      preferences: newProfile.preferences,
      stats: newProfile.stats,
      joined_at: newProfile.joinedDate?.toISOString()
    });

    if (!error) {
      this.currentUser.set(newProfile as UserProfile);
    } else {
      console.error('Error creating profile:', error);
    }
  }

  // Initialize Guest User
  private initializeGuestUser() {
    this.currentUser.set({
      id: 'guest',
      name: 'Guest User',
      email: 'guest@envello.app',
      avatar: 'https://ui-avatars.com/api/?name=Guest+User&background=random',
      role: 'Guest',
      joinedDate: new Date(),
      preferences: {
        emailNotifications: false,
        weeklyDigest: false,
        autoBackup: false,
        autoSchedule: false,
        gender: 'male'
      },
      stats: {
        totalWords: 0,
        totalDocuments: 0,
        totalProjects: 0,
        daysActive: 1,
        currentStreak: 0,
        lastLoginDate: new Date().toISOString()
      }
    });
  }

  // Helper to get avatar by gender
  getAvatarForGender(gender: 'male' | 'female'): string {
    return gender === 'male'
      ? 'https://api.dicebear.com/9.x/micah/svg?seed=Christopher&backgroundColor=f0f0f0'
      : 'https://api.dicebear.com/9.x/micah/svg?seed=Jessica&backgroundColor=f0f0f0';
  }

  // Update user profile
  async updateProfile(updates: Partial<UserProfile>) {
    const current = this.currentUser();
    if (!current) return;

    // Optimistic update
    const updatedProfile = { ...current, ...updates };
    this.currentUser.set(updatedProfile);

    // Sync to DB
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.full_name = updates.name;
    if (updates.email) dbUpdates.email = updates.email; // Usually emails shouldn't be updated this way
    if (updates.avatar) dbUpdates.avatar_url = updates.avatar;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;

    if (Object.keys(dbUpdates).length > 0) {
      await this.supabase.from('profiles').update(dbUpdates).eq('id', current.id);
    }
  }

  // Update preferences
  async updatePreferences(preferences: Partial<UserProfile['preferences']>) {
    const current = this.currentUser();
    if (!current) return;

    const newPreferences = { ...current.preferences, ...preferences };

    // Optimistic
    this.currentUser.set({ ...current, preferences: newPreferences });

    // DB
    await this.supabase.from('profiles').update({ preferences: newPreferences }).eq('id', current.id);
  }

  // Update stats
  async updateStats(stats: Partial<UserProfile['stats']>) {
    const current = this.currentUser();
    if (!current) return;

    const newStats = { ...current.stats, ...stats };

    // Optimistic
    this.currentUser.set({ ...current, stats: newStats });

    // DB
    await this.supabase.from('profiles').update({ stats: newStats }).eq('id', current.id);
  }

  // Increment word count
  addWords(count: number) {
    const current = this.currentUser();
    if (current) {
      this.updateStats({
        totalWords: (current.stats.totalWords || 0) + count
      });
    }
  }

  // Increment document count
  addDocument() {
    const current = this.currentUser();
    if (current) {
      this.updateStats({
        totalDocuments: (current.stats.totalDocuments || 0) + 1
      });
    }
  }

  // Logout
  logout() {
    this.authService.logout();
    this.currentUser.set(null);
  }

  private checkStreak(profile: UserProfile) {
    const today = new Date().toDateString();
    const lastLogin = new Date(profile.stats.lastLoginDate || new Date().toISOString()).toDateString();

    if (today === lastLogin) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    let newStreak = profile.stats.currentStreak;

    if (lastLogin === yesterdayString) {
      newStreak++;
    } else {
      newStreak = 1;
    }

    this.updateStats({
      currentStreak: newStreak,
      lastLoginDate: new Date().toISOString(),
      daysActive: (profile.stats.daysActive || 0) + 1
    });
  }
}
