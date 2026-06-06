import { Injectable, inject, effect, OnDestroy } from '@angular/core';
import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from '../config/powersync.schema';
import { SupabasePowerSyncConnector } from './powersync-connector';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class PowerSyncService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  readonly db = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: 'envello.db' },
  });

  private watchAbort = new AbortController();

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const isGuest = this.auth.isGuest();

      if (user && !isGuest) {
        const connector = new SupabasePowerSyncConnector(
          this.supabase,
          this.auth,
          environment.powerSyncUrl
        );
        this.db.connect(connector).then(() => this.watchTableChanges());
      } else {
        this.watchAbort.abort();
        this.watchAbort = new AbortController();
        this.db.disconnect();
      }
    });
  }

  private watchTableChanges(): void {
    const signal = this.watchAbort.signal;
    (async () => {
      try {
        // onChange fires on ANY row-level change (INSERT, UPDATE, DELETE),
        // unlike watch() which only fires when the query result changes.
        for await (const _ of this.db.onChange({ tables: ['user_data'], signal })) {
          window.dispatchEvent(new CustomEvent('envello:sync-complete'));
        }
      } catch {
        // AbortError on disconnect — expected
      }
    })();
  }

  ngOnDestroy(): void {
    this.watchAbort.abort();
    this.db.close();
  }
}
