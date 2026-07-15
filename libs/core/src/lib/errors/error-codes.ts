/**
 * Structured error codes for programmatic handling across Envello.
 *
 * Format: E_<DOMAIN>_<SPECIFICITY>
 * All codes are stable strings — safe to persist, log to Sentry, and match in tests.
 */
export enum AppErrorCode {
  // ── Sync ──────────────────────────────────────────────────────────────────
  SYNC_UPLOAD_FAILED   = 'E_SYNC_UPLOAD',
  SYNC_PULL_FAILED     = 'E_SYNC_PULL',
  SYNC_REALTIME_LOST   = 'E_SYNC_REALTIME',

  // ── Persistence (local DB) ─────────────────────────────────────────────────
  DB_WRITE_FAILED      = 'E_DB_WRITE',
  DB_READ_FAILED       = 'E_DB_READ',
  DB_DELETE_FAILED     = 'E_DB_DELETE',

  // ── Auth ──────────────────────────────────────────────────────────────────
  AUTH_TOKEN_EXPIRED   = 'E_AUTH_TOKEN',
  AUTH_LOGIN_FAILED    = 'E_AUTH_LOGIN',
  AUTH_GOOGLE_FAILED   = 'E_AUTH_GOOGLE',

  // ── AI ────────────────────────────────────────────────────────────────────
  AI_GENERATION_FAILED = 'E_AI_GEN',
  AI_PROVIDER_DOWN     = 'E_AI_PROVIDER',

  // ── Files ─────────────────────────────────────────────────────────────────
  FILE_UPLOAD_FAILED   = 'E_FILE_UPLOAD',
  FILE_DELETE_FAILED   = 'E_FILE_DELETE',
  FILE_TOO_LARGE       = 'E_FILE_SIZE',

  // ── Data integrity ────────────────────────────────────────────────────────
  IMPORT_PARSE_FAILED  = 'E_IMPORT_PARSE',
  VALIDATION_FAILED    = 'E_VALIDATION',

  // ── Fallback ──────────────────────────────────────────────────────────────
  UNKNOWN              = 'E_UNKNOWN',
}

/**
 * Typed application error.
 * Wrap lower-level errors with an AppError to attach a stable code and optional context
 * before they reach the GlobalErrorHandler / Sentry.
 *
 * @example
 * throw new AppError(AppErrorCode.SYNC_UPLOAD_FAILED, 'Supabase upsert failed', { collection });
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: AppErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    // Preserve V8 stack trace pointing to the throw site, not this constructor.
    if ((Error as any).captureStackTrace) (Error as any).captureStackTrace(this, AppError);
  }

  /** True when the error is definitively an AppError (survives serialise/deserialise). */
  static is(err: unknown): err is AppError {
    return err instanceof AppError || (err as any)?.name === 'AppError';
  }
}
