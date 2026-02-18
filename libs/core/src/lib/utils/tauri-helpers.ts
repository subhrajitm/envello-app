/**
 * Utility to suppress SQLite errors in non-Tauri environments
 */

/**
 * Check if running in Tauri environment
 */
export function isTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Log error only if running in Tauri environment
 * Suppresses errors in browser to avoid console spam
 */
export function logIfTauri(message: string, error: any): void {
    if (isTauriEnvironment()) {
        console.error(message, error);
    }
}

/**
 * Create an error handler that only logs in Tauri
 */
export function createTauriErrorHandler(message: string): (error: any) => void {
    return (error: any) => logIfTauri(message, error);
}
