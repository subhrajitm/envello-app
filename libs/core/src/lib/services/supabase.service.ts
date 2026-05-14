import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;
    private platformId = inject(PLATFORM_ID);

    constructor() {
        const isBrowser = isPlatformBrowser(this.platformId);

        this.supabase = createClient(environment.supabase.url, environment.supabase.key, {
            auth: {
                persistSession: isBrowser,
                autoRefreshToken: isBrowser,
                detectSessionInUrl: isBrowser
            }
        });
    }

    get client(): SupabaseClient {
        return this.supabase;
    }

    get auth(): any {
        return this.supabase.auth;
    }

    get from(): any {
        return this.supabase.from.bind(this.supabase);
    }

    get storage(): any {
        return this.supabase.storage;
    }

    // Auth Helpers
    getSession(): Promise<{ data: { session: Session | null }; error: any }> {
        return this.supabase.auth.getSession();
    }

    getUser(): Promise<{ data: { user: User | null }; error: any }> {
        return this.supabase.auth.getUser();
    }

    profile(user: User) {
        return this.supabase
            .from('profiles')
            .select(`username, website, avatar_url`)
            .eq('id', user.id)
            .single();
    }

    authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
        return this.supabase.auth.onAuthStateChange(callback);
    }

    signIn(email: string) {
        return this.supabase.auth.signInWithOtp({ email });
    }

    signOut() {
        return this.supabase.auth.signOut();
    }
}
