import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { WorkspaceProfileService } from './workspace-profile.service';

@Injectable({ providedIn: 'root' })
export class DesktopBackupService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(WorkspaceProfileService);

  private get userId(): string | null {
    return this.auth.currentUser()?.id ?? null;
  }

  private get profileId(): string {
    return this.profileService.activeProfileId() || 'default';
  }

  async push(collection: string, item: any): Promise<void> {
    const userId = this.userId;
    if (!userId || !item?.id) return;

    const { error } = await this.supabase.client
      .from('user_data')
      .upsert(
        {
          id: item.id,
          user_id: userId,
          profile_id: this.profileId,
          collection,
          data: item,
          deleted: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,profile_id,collection,id' }
      );

    if (error) console.error('[DesktopBackupService] push failed', collection, error);
  }

  async softDelete(collection: string, id: string): Promise<void> {
    const userId = this.userId;
    if (!userId) return;

    const { error } = await this.supabase.client
      .from('user_data')
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('collection', collection)
      .eq('user_id', userId);

    if (error) console.error('[DesktopBackupService] softDelete failed', collection, error);
  }

  async pullCollection<T>(collection: string): Promise<T[]> {
    const userId = this.userId;
    if (!userId) return [];

    const { data, error } = await this.supabase.client
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .eq('collection', collection)
      .eq('deleted', false);

    if (error) {
      console.error('[DesktopBackupService] pullCollection failed', collection, error);
      return [];
    }

    return (data ?? []).map(row => row['data'] as T);
  }
}
