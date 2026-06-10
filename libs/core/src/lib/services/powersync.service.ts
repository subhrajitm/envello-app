import { Injectable, inject, effect, OnDestroy } from '@angular/core';
import { PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web';
import { AppSchema } from '../config/powersync.schema';
import { SupabasePowerSyncConnector } from './powersync-connector';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { environment } from '../environments/environment';

// Pre-built UMD workers served as static assets; avoids esbuild trying to
// bundle the SharedWorker from inside node_modules (which Angular cannot do).
// Chunk files use publicPath = (worker directory)/../ so "assets/worker/" is required.
const DB_WORKER   = '/assets/worker/WASQLiteDB.umd.js';
const SYNC_WORKER = '/assets/worker/SharedSyncImplementation.umd.js';

@Injectable({ providedIn: 'root' })
export class PowerSyncService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  readonly db = new PowerSyncDatabase({
    schema: AppSchema,
    database: new WASQLiteOpenFactory({
      dbFilename: 'envello.db',
      worker: DB_WORKER,
    }),
    sync: {
      worker: SYNC_WORKER,
    },
  });

  /** Resolves once the SQLite engine is open and ready for queries. */
  readonly ready: Promise<void>;

  private watchAbort = new AbortController();

  private previousUserId: string | null = null;

  constructor() {
    this.ready = this.db.init().then(() => {
      window.dispatchEvent(new CustomEvent('envello:db-ready'));
    }).catch(err => {
      console.error('[PowerSyncService] DB init failed', err);
    });

    this.watchTableChanges();

    effect(() => {
      const user = this.auth.currentUser();
      const isGuest = this.auth.isGuest();

      if (user && !isGuest) {
        this.previousUserId = user.id;
        const connector = new SupabasePowerSyncConnector(
          this.supabase,
          this.auth,
          environment.powerSyncUrl
        );
        this.db.connect(connector);
      } else {
        if (this.previousUserId) {
          // Wipe local SQLite data when a real user logs out so their data
          // does not persist for the next person who opens the app.
          this.db.disconnectAndClear().catch(() => {});
          this.previousUserId = null;
        } else {
          this.db.disconnect();
        }
      }
    });
  }

  private watchTableChanges(): void {
    // This watcher runs for the full service lifetime; aborted only on ngOnDestroy.
    const signal = this.watchAbort.signal;
    (async () => {
      try {
        for await (const _ of this.db.onChange({ tables: ['user_data'], signal })) {
          window.dispatchEvent(new CustomEvent('envello:sync-complete'));
        }
      } catch {
        // AbortError on ngOnDestroy — expected
      }
    })();
  }

  ngOnDestroy(): void {
    this.watchAbort.abort();
    this.db.close();
  }
}
