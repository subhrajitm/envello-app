import { __decorate } from "tslib";
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';
let SupabaseService = class SupabaseService {
    supabase;
    platformId = inject(PLATFORM_ID);
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
    get client() {
        return this.supabase;
    }
    get auth() {
        return this.supabase.auth;
    }
    get from() {
        return this.supabase.from.bind(this.supabase);
    }
    get storage() {
        return this.supabase.storage;
    }
    // Auth Helpers
    getSession() {
        return this.supabase.auth.getSession();
    }
    getUser() {
        return this.supabase.auth.getUser();
    }
    profile(user) {
        return this.supabase
            .from('profiles')
            .select(`username, website, avatar_url`)
            .eq('id', user.id)
            .single();
    }
    authChanges(callback) {
        return this.supabase.auth.onAuthStateChange(callback);
    }
    signIn(email) {
        return this.supabase.auth.signInWithOtp({ email });
    }
    signOut() {
        return this.supabase.auth.signOut();
    }
};
SupabaseService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], SupabaseService);
export { SupabaseService };
