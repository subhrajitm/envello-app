import { Injectable, inject, signal } from '@angular/core';
import { DataService } from '@envello/data';
import { LibraryFile } from '@envello/domain';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';

export type { LibraryFile };

const BUCKET = 'library';
const MAX_SIZE_BYTES = 52_428_800; // 50 MB

@Injectable({ providedIn: 'root' })
export class FileLibraryService {
    private sb = inject(SupabaseService);
    private db = inject(DataService);
    private notify = inject(NotificationService);

    files = signal<LibraryFile[]>([]);
    uploading = signal(false);

    private bucketReady: Promise<boolean> | null = null;

    constructor() {
        this.load();
    }

    private async load() {
        try {
            const files = await this.db.getAll<LibraryFile>('library_files');
            this.files.set((files ?? []).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
        } catch (e) {
            console.warn('[FileLibrary] could not load metadata:', e);
        }
    }

    private ensureBucket(): Promise<boolean> {
        if (this.bucketReady) return this.bucketReady;

        this.bucketReady = this.sb.client.storage
            .createBucket(BUCKET, { public: true, fileSizeLimit: MAX_SIZE_BYTES })
            .then(({ error }) => {
                // "already exists" is fine — any other error is a real problem
                if (error && !error.message?.toLowerCase().includes('already exist')) {
                    console.warn('[FileLibrary] bucket init warning:', error.message);
                }
                return true;
            })
            .catch(() => true); // best-effort — upload attempt will surface any real error

        return this.bucketReady;
    }

    async upload(
        file: File,
        source?: { type: LibraryFile['sourceType']; id: string },
        libraryId?: string,
    ): Promise<LibraryFile> {
        if (file.size > MAX_SIZE_BYTES) {
            throw new Error(`"${file.name}" exceeds the 50 MB limit.`);
        }

        await this.ensureBucket();

        const { data: { user } } = await this.sb.client.auth.getUser();
        const userId = user?.id ?? 'anonymous';
        const fileId = crypto.randomUUID();
        const dotExt = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
        const storagePath = `${userId}/${fileId}${dotExt}`;

        const { error: uploadError } = await this.sb.client.storage
            .from(BUCKET)
            .upload(storagePath, file, { contentType: file.type, upsert: false });

        if (uploadError) {
            const msg = uploadError.message.toLowerCase().includes('not found') || uploadError.message.includes('404')
                ? `Storage bucket not configured. Create a public bucket named "${BUCKET}" in your Supabase dashboard.`
                : uploadError.message;
            throw new Error(msg);
        }

        const { data: { publicUrl } } = this.sb.client.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

        const entry: LibraryFile = {
            id: fileId,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            storagePath,
            publicUrl,
            uploadedAt: new Date().toISOString(),
            libraryId,
            sourceType: source?.type,
            sourceId: source?.id,
        };

        await this.db.upsert('library_files', entry);
        this.files.update(list => [entry, ...list]);
        return entry;
    }

    async uploadMany(
        files: File[],
        source?: { type: LibraryFile['sourceType']; id: string },
        libraryId?: string,
    ): Promise<LibraryFile[]> {
        this.uploading.set(true);
        const results: LibraryFile[] = [];
        const errors: string[] = [];

        for (const file of files) {
            try {
                const lf = await this.upload(file, source, libraryId);
                results.push(lf);
            } catch (e) {
                errors.push(`${file.name}: ${(e as Error).message}`);
            }
        }

        this.uploading.set(false);

        if (results.length > 0) {
            this.notify.success(
                'Upload complete',
                `${results.length} file${results.length !== 1 ? 's' : ''} saved to Library.`,
            );
        }
        if (errors.length > 0) {
            this.notify.error('Upload failed', errors.join('\n'));
        }

        return results;
    }

    async delete(fileId: string): Promise<void> {
        const file = this.files().find(f => f.id === fileId);
        if (!file) return;

        const { error } = await this.sb.client.storage
            .from(BUCKET)
            .remove([file.storagePath]);

        if (error) {
            this.notify.error('Delete failed', error.message);
            throw new Error(error.message);
        }

        await this.db.remove('library_files', fileId);
        this.files.update(list => list.filter(f => f.id !== fileId));
    }

    isImage(file: LibraryFile): boolean {
        return file.mimeType.startsWith('image/');
    }

    formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1_048_576).toFixed(1)} MB`;
    }

    fileIcon(mimeType: string): string {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'picture_as_pdf';
        if (mimeType.startsWith('video/')) return 'smart_display';
        if (mimeType.startsWith('audio/')) return 'audio_file';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'table_chart';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slideshow';
        if (mimeType.startsWith('text/')) return 'article';
        if (mimeType.includes('zip') || mimeType.includes('archive')) return 'folder_zip';
        return 'insert_drive_file';
    }
}
