/**
 * Note Model
 * Core note interface used across the application
 */
export interface Note {
    id: string;
    date: string;
    title: string;
    preview: string;
    content?: string; // HTML content (In-memory cache)
    tags?: string[];
    lastEdited?: string;
    filePath?: string;
    lastSynced?: string; // ISO date
}
