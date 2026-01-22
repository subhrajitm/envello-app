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
  };
  stats: {
    totalWords: number;
    totalDocuments: number;
    totalProjects: number;
    daysActive: number;
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

    // Initialize with demo user if no user exists
    if (!this.currentUser()) {
      this.initializeDemoUser();
    }
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
      }
    }
  }

  private initializeDemoUser() {
    const demoUser: UserProfile = {
      id: 'demo-user-001',
      name: 'Subhrajit Mandal',
      email: 'subhrajit@envello.app',
      bio: 'Creative writer and developer passionate about building tools for writers.',
      role: 'Pro User',
      joinedDate: new Date('2024-01-15'),
      preferences: {
        emailNotifications: true,
        weeklyDigest: true,
        autoBackup: true
      },
      stats: {
        totalWords: 142580,
        totalDocuments: 47,
        totalProjects: 12,
        daysActive: 365
      }
    };

    this.currentUser.set(demoUser);
    this.saveUser();
  }
}
