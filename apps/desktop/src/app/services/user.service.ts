import { Injectable, signal, computed } from '@angular/core';

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
  private currentUser = signal<UserProfile | null>(null);

  // Public read-only signals
  user = this.currentUser.asReadonly();

  // Computed values
  isLoggedIn = computed(() => this.currentUser() !== null);
  userName = computed(() => this.currentUser()?.name || 'Guest');
  userInitials = computed(() => {
    const name = this.currentUser()?.name || 'G';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  constructor() {
    this.loadUser();
    this.checkStreak();
  }

  // Update user profile
  updateProfile(updates: Partial<UserProfile>) {
    const current = this.currentUser();
    if (current) {
      this.currentUser.set({ ...current, ...updates });
      this.saveUser();
    }
  }

  // Update preferences
  updatePreferences(preferences: Partial<UserProfile['preferences']>) {
    const current = this.currentUser();
    if (current) {
      this.currentUser.set({
        ...current,
        preferences: { ...current.preferences, ...preferences }
      });
      this.saveUser();
    }
  }

  // Update stats
  updateStats(stats: Partial<UserProfile['stats']>) {
    const current = this.currentUser();
    if (current) {
      this.currentUser.set({
        ...current,
        stats: { ...current.stats, ...stats }
      });
      this.saveUser();
    }
  }

  // Increment word count
  addWords(count: number) {
    const current = this.currentUser();
    if (current) {
      this.updateStats({
        totalWords: current.stats.totalWords + count
      });
    }
  }

  // Increment document count
  addDocument() {
    const current = this.currentUser();
    if (current) {
      this.updateStats({
        totalDocuments: current.stats.totalDocuments + 1
      });
    }
  }

  // Set avatar
  setAvatar(avatarUrl: string) {
    this.updateProfile({ avatar: avatarUrl });
  }

  // Clear avatar
  clearAvatar() {
    this.updateProfile({ avatar: undefined });
  }

  // Logout
  logout() {
    if (confirm('Are you sure you want to logout?')) {
      this.currentUser.set(null);
      localStorage.removeItem('envello-user');
      // Could redirect to login page here
    }
  }

  // Private methods
  private saveUser() {
    const user = this.currentUser();
    if (user) {
      const data = {
        ...user,
        joinedDate: user.joinedDate.toISOString()
      };
      localStorage.setItem('envello-user', JSON.stringify(data));
    }
  }

  private loadUser() {
    const saved = localStorage.getItem('envello-user');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.currentUser.set({
          ...data,
          joinedDate: new Date(data.joinedDate)
        });
      } catch (e) {
        console.error('Failed to load user:', e);
        this.initializeGuestUser();
      }
    } else {
      this.initializeGuestUser();
    }
  }

  private checkStreak() {
    const user = this.currentUser();
    if (!user) return;

    const today = new Date().toDateString();
    const lastLogin = new Date(user.stats.lastLoginDate || new Date().toISOString()).toDateString();

    if (today === lastLogin) {
      return; // Already logged in today
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    let newStreak = user.stats.currentStreak;

    if (lastLogin === yesterdayString) {
      // Login was yesterday, increment streak
      newStreak++;
    } else {
      // Streak broken, reset to 1 (today is day 1)
      newStreak = 1;
    }

    this.updateStats({
      currentStreak: newStreak,
      lastLoginDate: new Date().toISOString(),
      daysActive: user.stats.daysActive + 1
    });
  }

  private initializeGuestUser() {
    this.currentUser.set({
      id: 'guest-' + Date.now().toString(),
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
    });
    this.saveUser();
  }

  getAvatarForGender(gender: 'male' | 'female'): string {
    return gender === 'male'
      ? 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff'
      : 'https://ui-avatars.com/api/?name=User&background=E91E63&color=fff';
  }
}
