import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;
    private _currentUser = new BehaviorSubject<User | null>(null);

    // Expose current user as signal-like or observable
    readonly currentUser$ = this._currentUser.asObservable();

    get client() {
        return this.supabase;
    }

    constructor() {
        this.supabase = createClient(environment.supabase.url, environment.supabase.key);
        this.initSession();
    }

    private async initSession() {
        const { data } = await this.supabase.auth.getSession();
        if (data.session?.user) {
            this._currentUser.next(data.session.user);
        }

        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                this._currentUser.next(session?.user ?? null);
            } else if (event === 'SIGNED_OUT') {
                this._currentUser.next(null);
            }
        });
    }

    // Auth Helpers
    getSession() {
        return this.supabase.auth.getSession();
    }

    getUser() {
        return this.supabase.auth.getUser();
    }

    authChanges(callback: (event: string, session: Session | null) => void) {
        return this.supabase.auth.onAuthStateChange(callback);
    }

    get user() {
        return this._currentUser.value;
    }

    async signInWithGoogle() {
        return this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
    }

    async signInWithGithub() {
        return this.supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin
            }
        });
    }

    async signOut() {
        return this.supabase.auth.signOut();
    }
}
