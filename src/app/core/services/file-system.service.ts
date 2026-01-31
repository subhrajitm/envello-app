import { Injectable, inject } from '@angular/core';
import { TauriService } from './tauri.service';
import { documentDir, join } from '@tauri-apps/api/path';
import { mkdir, exists, writeTextFile, readTextFile, rename, remove } from '@tauri-apps/plugin-fs';

@Injectable({
    providedIn: 'root'
})
export class FileSystemService {
    private tauri = inject(TauriService);
    private initialized = false;
    private notesDir = '';

    async init() {
        if (this.initialized) return;
        if (!this.tauri.isTauri()) return;

        try {
            const docDir = await documentDir();
            this.notesDir = await join(docDir, 'envello', 'notes');

            const dirExists = await exists(this.notesDir);
            if (!dirExists) {
                // Recursive true is not supported in all versions of fs plugin directly like node, 
                // but let's assume we create envello then notes.
                // Actually tauri-plugin-fs mkdir has options? checking docs or assuming simple.
                // Let's safe bet: create parent then child or use recursive option if available.
                // v2 plugin usually supports recursive
                await mkdir(this.notesDir, { recursive: true });
            }
            this.initialized = true;
        } catch (e) {
            console.error('Failed to initialize file system', e);
        }
    }

    async saveNote(id: string, content: string): Promise<string> {
        if (!this.tauri.isTauri()) {
            localStorage.setItem(`note_${id}`, content);
            return '';
        }
        await this.init();

        const fileName = `${id}.md`;
        const filePath = await join(this.notesDir, fileName);
        const tempPath = await join(this.notesDir, `${id}.tmp`);

        // Atomic write: Write to temp, then rename
        await writeTextFile(tempPath, content);
        await rename(tempPath, filePath);

        return filePath;
    }

    async readNote(id: string): Promise<string | null> {
        if (!this.tauri.isTauri()) {
            return localStorage.getItem(`note_${id}`);
        }
        await this.init();

        const filePath = await join(this.notesDir, `${id}.md`);
        try {
            const fileExists = await exists(filePath);
            if (!fileExists) return null;
            return await readTextFile(filePath);
        } catch (e) {
            console.error(`Failed to read note ${id}`, e);
            return null;
        }
    }

    async deleteNote(id: string): Promise<void> {
        if (!this.tauri.isTauri()) {
            localStorage.removeItem(`note_${id}`);
            return;
        }
        await this.init();

        const filePath = await join(this.notesDir, `${id}.md`);
        try {
            if (await exists(filePath)) {
                await remove(filePath);
            }
        } catch (e) {
            console.error(`Failed to delete note ${id}`, e);
        }
    }
}
