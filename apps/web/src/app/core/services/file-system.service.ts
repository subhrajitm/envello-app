import { Injectable, inject } from '@angular/core';
import { TauriService } from './tauri.service';
import { documentDir, join } from '@tauri-apps/api/path';
import { mkdir, exists, writeTextFile, readTextFile, rename, remove } from '@tauri-apps/plugin-fs';
import { RxdbService } from './rxdb.service';

@Injectable({
    providedIn: 'root'
})
export class FileSystemService {
    private tauri = inject(TauriService);
    private rxdb = inject(RxdbService); // Inject RxDB
    private initialized = false;
    private baseDir = '';

    async init() {
        if (this.initialized) return;
        if (!this.tauri.isTauri()) return;

        try {
            const docDir = await documentDir();
            this.baseDir = await join(docDir, 'envello');

            const dirExists = await exists(this.baseDir);
            if (!dirExists) {
                await mkdir(this.baseDir, { recursive: true });
            }
            this.initialized = true;
        } catch (e) {
            console.error('Failed to initialize file system', e);
        }
    }

    /**
     * Generic save method for any content type
     * @param category Subfolder (e.g. 'notes', 'journal', 'articles', 'novels/my-book')
     * @param id Filename without extension
     * @param content Text content
     * @param extension File extension (default: md)
     */
    async saveFile(category: string, id: string, content: string, extension: string = 'md'): Promise<string> {
        // Web: Save to RxDB (IndexedDB)
        if (!this.tauri.isTauri()) {
            try {
                // Fallback to localStorage removed. Using RxDB for limitless storage.
                await this.rxdb.upsertFile(category, id, content);
                return ''; // No path on web
            } catch (e) {
                console.error(`[FileSystem] Failed to save to RxDB ${category}/${id}`, e);
                // Last resort fallback (optional)
                localStorage.setItem(`${category}_${id}`, content);
                return '';
            }
        }

        // Desktop: Save to Disk
        await this.init();

        try {
            const categoryDir = await join(this.baseDir, category);
            if (!(await exists(categoryDir))) {
                await mkdir(categoryDir, { recursive: true });
            }

            const fileName = `${id}.${extension}`;
            const filePath = await join(categoryDir, fileName);
            const tempPath = await join(categoryDir, `${id}.tmp`);

            // Atomic write
            await writeTextFile(tempPath, content);
            await rename(tempPath, filePath);

            return filePath;
        } catch (e) {
            console.error(`[FileSystem] Failed to save ${category}/${id}`, e);
            throw e;
        }
    }

    async readFile(category: string, id: string, extension: string = 'md'): Promise<string | null> {
        // Web: Read from RxDB
        if (!this.tauri.isTauri()) {
            try {
                const fileDoc = await this.rxdb.getFile(category, id);
                if (fileDoc) return fileDoc.content;

                // Migration: Check localStorage if not in DB
                const local = localStorage.getItem(`${category}_${id}`);
                if (local) {
                    // Migrate to DB
                    await this.rxdb.upsertFile(category, id, local);
                    return local;
                }
                return null;
            } catch (e) {
                console.error(`[FileSystem] Failed to read from RxDB ${category}/${id}`, e);
                return null;
            }
        }

        // Desktop: Read from Disk
        await this.init();

        try {
            const filePath = await join(this.baseDir, category, `${id}.${extension}`);
            const fileExists = await exists(filePath);
            if (!fileExists) return null;
            return await readTextFile(filePath);
        } catch (e) {
            console.error(`[FileSystem] Failed to read ${category}/${id}`, e);
            return null;
        }
    }

    async deleteFile(category: string, id: string, extension: string = 'md'): Promise<void> {
        // Web: Delete from RxDB
        if (!this.tauri.isTauri()) {
            try {
                await this.rxdb.removeFile(category, id);
                localStorage.removeItem(`${category}_${id}`); // Clean up legacy
            } catch (e) {
                console.error(`[FileSystem] Failed to delete from RxDB ${category}/${id}`, e);
            }
            return;
        }

        // Desktop: Delete from Disk
        await this.init();

        try {
            const filePath = await join(this.baseDir, category, `${id}.${extension}`);
            if (await exists(filePath)) {
                await remove(filePath);
            }
        } catch (e) {
            console.error(`[FileSystem] Failed to delete ${category}/${id}`, e);
        }
    }

    // Legacy wrappers for existing StoreService
    async saveNote(id: string, content: string): Promise<string> {
        return this.saveFile('notes', id, content, 'md');
    }

    async readNote(id: string): Promise<string | null> {
        return this.readFile('notes', id, 'md');
    }

    async deleteNote(id: string): Promise<void> {
        return this.deleteFile('notes', id, 'md');
    }
}
