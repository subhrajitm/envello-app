import { Injectable, inject, signal } from '@angular/core';
import { DataService } from '@envello/data';
import { StorageFile } from '@envello/domain';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';

export type { StorageFile };

const BUCKET = 'knowledge-files';
const MAX_SIZE_BYTES = 52_428_800; // 50 MB
const SIGNED_URL_TTL = 3600; // 1 hour

@Injectable({ providedIn: 'root' })
export class FileStorageService {
    private sb = inject(SupabaseService);
    private db = inject(DataService);
    private notify = inject(NotificationService);

    files = signal<StorageFile[]>([]);
    uploading = signal(false);

    private signedUrlCache = signal<Record<string, string>>({});

    constructor() {
        this.load();
    }

    displayUrl(fileId: string): string {
        return this.signedUrlCache()[fileId] ?? '';
    }

    async getSignedUrl(storagePath: string, expiresIn = SIGNED_URL_TTL): Promise<string> {
        const { data, error } = await this.sb.client.storage
            .from(BUCKET)
            .createSignedUrl(storagePath, expiresIn);
        if (error || !data) throw new Error(error?.message ?? 'Failed to generate download link');
        return data.signedUrl;
    }

    private async resolveSignedUrls(files: StorageFile[]): Promise<void> {
        if (!files.length) return;
        const { data } = await this.sb.client.storage
            .from(BUCKET)
            .createSignedUrls(files.map(f => f.storagePath), SIGNED_URL_TTL);
        if (!data) return;
        const updates: Record<string, string> = {};
        for (const file of files) {
            const entry = data.find(d => d.path === file.storagePath);
            if (entry?.signedUrl) updates[file.id] = entry.signedUrl;
        }
        this.signedUrlCache.update(cache => ({ ...cache, ...updates }));
    }

    private async load() {
        try {
            const files = await this.db.getAll<StorageFile>('library_files');
            const sorted = (files ?? []).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
            this.files.set(sorted);
            await this.resolveSignedUrls(sorted);
        } catch (e) {
            console.warn('[FileStorage] could not load metadata:', e);
        }
    }

    async upload(
        file: File,
        source?: { type: StorageFile['sourceType']; id: string },
        collectionId?: string,
    ): Promise<StorageFile> {
        if (file.size > MAX_SIZE_BYTES) {
            throw new Error(`"${file.name}" exceeds the 50 MB limit.`);
        }

        const { data: { user } } = await this.sb.client.auth.getUser();
        const userId = user?.id ?? 'anonymous';
        const fileId = crypto.randomUUID();
        const dotExt = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
        const storagePath = `${userId}/${fileId}${dotExt}`;

        const { error: uploadError } = await this.sb.client.storage
            .from(BUCKET)
            .upload(storagePath, file, { contentType: file.type, upsert: false });

        if (uploadError) {
            const lower = uploadError.message.toLowerCase();
            const msg = lower.includes('not found') || lower.includes('404')
                ? `Storage bucket not configured. Create a private bucket named "${BUCKET}" in your Supabase dashboard.`
                : lower.includes('row-level security') || lower.includes('violates')
                    ? `Storage permissions not configured. Run the storage policy SQL from supabase_schema.sql in your Supabase dashboard.`
                    : uploadError.message;
            throw new Error(msg);
        }

        const entry: StorageFile = {
            id: fileId,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            storagePath,
            uploadedAt: new Date().toISOString(),
            libraryId: collectionId,
            sourceType: source?.type,
            sourceId: source?.id,
        };

        await this.db.upsert('library_files', entry);
        this.files.update(list => [entry, ...list]);

        const signedUrl = await this.getSignedUrl(storagePath).catch(() => '');
        if (signedUrl) this.signedUrlCache.update(c => ({ ...c, [fileId]: signedUrl }));

        return entry;
    }

    async uploadMany(
        files: File[],
        source?: { type: StorageFile['sourceType']; id: string },
        collectionId?: string,
    ): Promise<StorageFile[]> {
        this.uploading.set(true);
        const results: StorageFile[] = [];
        const errors: string[] = [];

        for (const file of files) {
            try {
                const sf = await this.upload(file, source, collectionId);
                results.push(sf);
            } catch (e) {
                errors.push(`${file.name}: ${(e as Error).message}`);
            }
        }

        this.uploading.set(false);

        if (results.length > 0) {
            this.notify.success(
                'Upload complete',
                `${results.length} file${results.length !== 1 ? 's' : ''} uploaded successfully.`,
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

    isImage(file: StorageFile): boolean {
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
