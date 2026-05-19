import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@envello/core';

export interface PlatformAiConfig {
  provider: string;
  model_name: string;
  api_key: string;
  ai_enabled: boolean;
  updated_at?: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  affects: 'All Users' | 'Admins only' | 'Beta users';
  updated_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  ai_usage: number;
  created_at: string;
}

export interface UsageRow {
  user_id: string;
  email: string;
  provider: string;
  model: string;
  requests: number;
  total_chars: number;
  last_active: string;
}

export interface UsageSummary {
  total_requests: number;
  total_chars: number;
}

export interface AuditEntry {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_id: string | null;
  details: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private sb = inject(SupabaseService);

  // ── Platform AI Config ──────────────────────────────────────────────────────

  async loadAiConfig(): Promise<PlatformAiConfig | null> {
    const { data, error } = await this.sb.client
      .from('platform_ai_config')
      .select('provider, model_name, api_key, ai_enabled, updated_at')
      .single();
    if (error) { console.error('[AdminService] loadAiConfig', error); return null; }
    return data as PlatformAiConfig;
  }

  async saveAiConfig(config: Partial<PlatformAiConfig>): Promise<{ error: string | null }> {
    const { data: { user } } = await this.sb.client.auth.getUser();
    const { error } = await this.sb.client
      .from('platform_ai_config')
      .update({ ...config, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('id', 1);
    if (!error) await this.logAudit('ai_config_update', null, `provider=${config.provider ?? '—'}`);
    return { error: error?.message ?? null };
  }

  // ── Feature Flags ───────────────────────────────────────────────────────────

  async loadFeatureFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await this.sb.client
      .from('feature_flags')
      .select('*')
      .order('name');
    if (error) { console.error('[AdminService] loadFeatureFlags', error); return []; }
    return (data ?? []) as FeatureFlag[];
  }

  async saveFeatureFlags(flags: FeatureFlag[]): Promise<{ error: string | null }> {
    const rows = flags.map(f => ({ ...f, updated_at: new Date().toISOString() }));
    const { error } = await this.sb.client
      .from('feature_flags')
      .upsert(rows, { onConflict: 'id' });
    if (!error) {
      const summary = flags.map(f => `${f.name}=${f.enabled}`).join(', ');
      await this.logAudit('flag_update', null, summary);
    }
    return { error: error?.message ?? null };
  }

  // ── Users ───────────────────────────────────────────────────────────────────

  async loadUsers(): Promise<AdminUser[]> {
    // Fetch profiles and usage counts in parallel.
    // The ai_usage_logs FK points to auth.users (not profiles), so PostgREST
    // can't auto-join — we aggregate client-side instead.
    const [profilesRes, usageRes] = await Promise.all([
      this.sb.client.from('profiles').select('id, email, full_name, avatar_url, role, status, created_at'),
      this.sb.client.from('ai_usage_logs').select('user_id'),
    ]);
    if (profilesRes.error) { console.error('[AdminService] loadUsers', profilesRes.error); return []; }

    const countMap = new Map<string, number>();
    for (const row of (usageRes.data ?? []) as { user_id: string }[]) {
      if (row.user_id) countMap.set(row.user_id, (countMap.get(row.user_id) ?? 0) + 1);
    }

    return (profilesRes.data ?? []).map((p: any) => ({
      id: p.id,
      email: p.email ?? '',
      full_name: p.full_name ?? 'Unknown',
      avatar_url: p.avatar_url ?? '',
      role: p.role ?? 'user',
      status: p.status ?? 'active',
      ai_usage: countMap.get(p.id) ?? 0,
      created_at: p.created_at ?? '',
    }));
  }

  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<{ error: string | null }> {
    const { error } = await this.sb.client
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (!error) await this.logAudit('role_change', userId, `role → ${role}`);
    return { error: error?.message ?? null };
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<{ error: string | null }> {
    const { error } = await this.sb.client
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (!error) await this.logAudit('status_change', userId, `status → ${status}`);
    return { error: error?.message ?? null };
  }

  // ── Usage ───────────────────────────────────────────────────────────────────

  async loadUsageSummary(filter: 'today' | 'week' | 'month'): Promise<UsageSummary> {
    const since = this.filterToDate(filter);
    const { data, error } = await this.sb.client
      .from('ai_usage_logs')
      .select('prompt_length, response_length')
      .gte('created_at', since.toISOString());
    if (error || !data) return { total_requests: 0, total_chars: 0 };
    return {
      total_requests: data.length,
      total_chars: data.reduce((s, r) => s + r.prompt_length + r.response_length, 0),
    };
  }

  async loadUsageByUser(filter: 'today' | 'week' | 'month'): Promise<UsageRow[]> {
    const since = this.filterToDate(filter);
    const { data, error } = await this.sb.client
      .from('ai_usage_logs')
      .select('user_id, provider, model, prompt_length, response_length, created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    // Aggregate by user
    const map = new Map<string, UsageRow>();
    for (const row of data as any[]) {
      const uid = row.user_id ?? 'anonymous';
      const existing = map.get(uid);
      if (existing) {
        existing.requests++;
        existing.total_chars += (row.prompt_length ?? 0) + (row.response_length ?? 0);
      } else {
        map.set(uid, {
          user_id: uid,
          email: '',
          provider: row.provider,
          model: row.model,
          requests: 1,
          total_chars: (row.prompt_length ?? 0) + (row.response_length ?? 0),
          last_active: row.created_at,
        });
      }
    }

    // Enrich with emails from profiles
    const userIds = [...map.keys()].filter(id => id !== 'anonymous');
    if (userIds.length) {
      const { data: profiles } = await this.sb.client
        .from('profiles').select('id, email').in('id', userIds);
      const emailMap = new Map((profiles ?? []).map((p: any) => [p.id, p.email ?? '']));
      for (const [uid, row] of map) {
        row.email = emailMap.get(uid) || uid.substring(0, 8) + '…';
      }
    }

    return Array.from(map.values()).sort((a, b) => b.requests - a.requests);
  }

  async loadProviderBreakdown(filter: 'today' | 'week' | 'month'): Promise<{ provider: string; count: number; pct: number }[]> {
    const since = this.filterToDate(filter);
    const { data } = await this.sb.client
      .from('ai_usage_logs')
      .select('provider')
      .gte('created_at', since.toISOString());
    const map = new Map<string, number>();
    for (const row of (data ?? []) as { provider: string }[]) {
      map.set(row.provider, (map.get(row.provider) ?? 0) + 1);
    }
    const total = [...map.values()].reduce((s, v) => s + v, 0) || 1;
    return [...map.entries()]
      .map(([provider, count]) => ({ provider, count, pct: Math.round(count / total * 100) }))
      .sort((a, b) => b.count - a.count);
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  async loadDashboardStats(): Promise<{
    totalUsers: number;
    aiRequestsToday: number;
    activeFlagCount: number;
    platformProvider: string;
  }> {
    const [usersRes, usageRes, flagsRes, configRes] = await Promise.all([
      this.sb.client.from('profiles').select('id', { count: 'exact', head: true }),
      this.sb.client.from('ai_usage_logs').select('id', { count: 'exact', head: true })
        .gte('created_at', this.filterToDate('today').toISOString()),
      this.sb.client.from('feature_flags').select('id', { count: 'exact', head: true }).eq('enabled', true),
      this.sb.client.from('platform_ai_config').select('provider').single(),
    ]);
    return {
      totalUsers: usersRes.count ?? 0,
      aiRequestsToday: usageRes.count ?? 0,
      activeFlagCount: flagsRes.count ?? 0,
      platformProvider: (configRes.data as any)?.provider ?? 'mock',
    };
  }

  async loadRecentActivity(): Promise<{ user_id: string; email: string; provider: string; model: string; created_at: string }[]> {
    const { data } = await this.sb.client
      .from('ai_usage_logs')
      .select('user_id, provider, model, created_at')
      .order('created_at', { ascending: false })
      .limit(8);
    if (!data?.length) return [];

    const userIds = [...new Set((data as any[]).map(r => r.user_id).filter(Boolean))];
    const { data: profiles } = await this.sb.client
      .from('profiles').select('id, email').in('id', userIds);
    const emailMap = new Map((profiles ?? []).map((p: any) => [p.id, p.email ?? '']));

    return (data as any[]).map(r => ({
      ...r,
      email: emailMap.get(r.user_id) || (r.user_id ? r.user_id.substring(0, 8) + '…' : 'unknown'),
    }));
  }

  // ── Audit Log ───────────────────────────────────────────────────────────────

  async logAudit(action: string, targetId: string | null, details: string): Promise<void> {
    try {
      const { data: { user } } = await this.sb.client.auth.getUser();
      await this.sb.client.from('admin_audit_log').insert({
        admin_id: user?.id ?? null,
        admin_email: user?.email ?? '',
        action,
        target_id: targetId,
        details,
      });
    } catch (e) {
      console.error('[AdminService] logAudit', e);
    }
  }

  async loadAuditLog(limit = 100): Promise<AuditEntry[]> {
    const { data, error } = await this.sb.client
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('[AdminService] loadAuditLog', error); return []; }
    return (data ?? []) as AuditEntry[];
  }

  private filterToDate(filter: 'today' | 'week' | 'month'): Date {
    const d = new Date();
    if (filter === 'today') { d.setHours(0, 0, 0, 0); }
    else if (filter === 'week') { d.setDate(d.getDate() - 7); }
    else { d.setMonth(d.getMonth() - 1); }
    return d;
  }
}
