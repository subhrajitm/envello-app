/**
 * Utility to suppress SQLite errors in non-Tauri environments
 */
/**
 * Check if running in Tauri environment
 */
export function isTauriEnvironment() {
    return typeof window !== 'undefined' && '__TAURI__' in window;
}
/**
 * Log error only if running in Tauri environment
 * Suppresses errors in browser to avoid console spam
 */
export function logIfTauri(message, error) {
    if (isTauriEnvironment()) {
        console.error(message, error);
    }
}
/**
 * Create an error handler that only logs in Tauri
 */
export function createTauriErrorHandler(message) {
    return (error) => logIfTauri(message, error);
}
