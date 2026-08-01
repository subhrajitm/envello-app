import { Injectable, inject, effect, OnDestroy, Injector, InjectionToken, signal } from '@angular/core';
import { PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web';
import { AppSchema } from '../config/powersync.schema';
import { SupabasePowerSyncConnector } from './powersync-connector';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { PowerSyncDataService } from './powersync-data.service';
import { DesktopSyncSettingsService } from './desktop-sync-settings.service';
import { environment } from '../environments/environment';

// Pre-built UMD workers served as static assets; avoids esbuild trying to
// bundle the SharedWorker from inside node_modules (which Angular cannot do).
// Chunk files use publicPath = (worker directory)/../ so "assets/worker/" is required.
const DB_WORKER   = '/assets/worker/WASQLiteDB.umd.js';
const SYNC_WORKER = '/assets/worker/SharedSyncImplementation.umd.js';

/** Per-platform PowerSync flags. Desktop provides { enableMultiTabs: false } to
 *  avoid SharedWorker (not supported in Tauri's WKWebView on macOS).
 *  Web leaves this token unprovided and gets the default multi-tab behaviour. */
export const POWERSYNC_FLAGS = new InjectionToken<{ enableMultiTabs?: boolean }>('POWERSYNC_FLAGS');

@Injectable({ providedIn: 'root' })
export class PowerSyncService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly injector = inject(Injector);
  private readonly syncSettings = inject(DesktopSyncSettingsService);

  // Lazy to break the PowerSyncService ↔ PowerSyncDataService circular dependency.
  private get dataService(): PowerSyncDataService {
    return this.injector.get(PowerSyncDataService);
  }

  // Injected before db so this.psFlags is defined when the db field runs.
  private readonly psFlags = inject(POWERSYNC_FLAGS, { optional: true });

  readonly db = new PowerSyncDatabase({
    schema: AppSchema,
    database: new WASQLiteOpenFactory({
      dbFilename: 'envello.db',
      worker: DB_WORKER,
      flags: this.psFlags ?? {},
    }),
    sync: {
      worker: SYNC_WORKER,
    },
  });

  /** Resolves once the SQLite engine is open and ready for queries. */
  readonly ready: Promise<void>;

  // ── Sync status signals (readable from any component) ───────────────────────
  readonly isConnected = signal(false);
  readonly isSyncing   = signal(false);
  readonly syncError   = signal<string | null>(null);

  private watchAbort = new AbortController();
  private statusPollId?: ReturnType<typeof setInterval>;
  private previousUserId: string | null = null;

  constructor() {
    this.ready = this.db.init().then(() => {
      window.dispatchEvent(new CustomEvent('envello:db-ready'));
    }).catch(err => {
      console.error('[PowerSyncService] DB init failed', err);
    });

    this.watchTableChanges();
    this.watchSyncStatus();

    effect(() => {
      const user = this.auth.currentUser();
      const isGuest = this.auth.isGuest();

      if (user && !isGuest) {
        this.previousUserId = user.id;
        const connector = new SupabasePowerSyncConnector(
          this.supabase,
          this.auth,
          environment.powerSyncUrl,
          (col) => this.syncSettings.isEnabled(col),
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
    const signal = this.watchAbort.signal;
    (async () => {
      try {
        // Watch user_data for PowerSync sync downloads.
        // When PowerSync writes new data here, unpack it into the typed local tables
        // so getAll() queries benefit from column indexes without JSON parsing.
        for await (const _ of this.db.onChange({ tables: ['user_data'], signal })) {
          await this.dataService.rebuildTypedTablesFromUserData();
          window.dispatchEvent(new CustomEvent('envello:sync-complete'));
        }
      } catch {
        // AbortError on ngOnDestroy — expected
      }
    })();
  }

  /** Poll PowerSync's currentStatus every 2 s and push changes to signals. */
  private watchSyncStatus(): void {
    this.statusPollId = setInterval(() => {
      try {
        const status = this.db.currentStatus;
        this.isConnected.set(status.connected ?? false);
        const df = (status as any).dataFlow;
        this.isSyncing.set(df?.downloading === true || df?.uploading === true);
        if (df?.downloadError) {
          this.syncError.set((df.downloadError as Error).message ?? 'Download error');
        } else if (df?.uploadError) {
          this.syncError.set((df.uploadError as Error).message ?? 'Upload error');
        } else {
          this.syncError.set(null);
        }
      } catch {
        // db not yet ready — ignore
      }
    }, 2000);
  }

  ngOnDestroy(): void {
    this.watchAbort.abort();
    if (this.statusPollId) clearInterval(this.statusPollId);
    this.db.close();
  }
}
