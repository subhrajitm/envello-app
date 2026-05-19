import { Injectable, InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export const SUPABASE_STORAGE_KEY = new InjectionToken<string>('SUPABASE_STORAGE_KEY');
export const SUPABASE_SILENT_LOCK = new InjectionToken<boolean>('SUPABASE_SILENT_LOCK');

/** Drop-in lock used in the admin app. Behaves identically to the default
 *  navigatorLock except that when acquireTimeout===0 (background auto-refresh
 *  ticks), it rejects with a typed error that Supabase handles gracefully —
 *  without resolving undefined, which would corrupt auth state. */
async function silentNavigatorLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
    if (typeof navigator === 'undefined' || !navigator.locks) return fn();
    return new Promise<R>((resolve, reject) => {
        navigator.locks.request(
            name,
            acquireTimeout === 0 ? { mode: 'exclusive', ifAvailable: true } : { mode: 'exclusive' },
            async (lock: Lock | null) => {
                if (!lock && acquireTimeout === 0) {
                    // Throw — not resolve(undefined) — so Supabase internals handle
                    // the "lock busy" case correctly and don't emit SIGNED_OUT.
                    reject(Object.assign(
                        new Error(`Lock "${name}" not immediately available`),
                        { isAcquireTimeout: true }
                    ));
                    return;
                }
                try { resolve(await fn()); } catch (e) { reject(e); }
            }
        );
    });
}

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;
    private platformId = inject(PLATFORM_ID);

    constructor() {
        const isBrowser = isPlatformBrowser(this.platformId);
        const storageKey = inject(SUPABASE_STORAGE_KEY, { optional: true }) ?? undefined;
        const silentLock = inject(SUPABASE_SILENT_LOCK, { optional: true }) ?? false;

        this.supabase = createClient(environment.supabase.url, environment.supabase.key, {
            auth: {
                persistSession: isBrowser,
                autoRefreshToken: isBrowser,
                detectSessionInUrl: isBrowser,
                ...(storageKey ? { storageKey } : {}),
                ...(silentLock && isBrowser ? { lock: silentNavigatorLock } : {}),
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
