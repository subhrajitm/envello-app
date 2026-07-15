import { Injectable, inject, signal, computed } from '@angular/core';
import { DataService } from '@envello/data';
import { StorageFile } from '@envello/domain';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';
import { AppError, AppErrorCode } from '../errors/error-codes';

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
    /** True when any upload is in flight. */
    uploading = signal(false);
    /** Names of files currently being uploaded, in insertion order. */
    uploadingFileNames = signal<string[]>([]);
    /** Per-file upload progress 0–100. Key is the original file name. */
    uploadProgress = signal<Record<string, number>>({});
    /** Derived: the file name currently at the front of the upload queue (or null). */
    currentUploadName = computed(() => this.uploadingFileNames()[0] ?? null);

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
            const msg = `"${file.name}" exceeds the 50 MB upload limit (${this.formatSize(file.size)}).`;
            this.notify.error('File too large', msg);
            throw new AppError(AppErrorCode.FILE_TOO_LARGE, msg, { fileName: file.name, sizeBytes: file.size });
        }

        const [{ data: { user } }, { data: { session } }] = await Promise.all([
            this.sb.client.auth.getUser(),
            this.sb.client.auth.getSession(),
        ]);
        const userId = user?.id ?? 'anonymous';
        const token  = session?.access_token ?? '';
        const fileId = crypto.randomUUID();
        const dotExt = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
        const storagePath = `${userId}/${fileId}${dotExt}`;

        await this.uploadViaXhr(file, storagePath, token);

        const entry: StorageFile = {
            id: fileId,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            storagePath,
            uploadedAt: new Date().toISOString(),
            collectionId: collectionId,
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
            this.uploadingFileNames.update(names => [...names, file.name]);
            try {
                const sf = await this.upload(file, source, collectionId);
                results.push(sf);
            } catch (e) {
                // Quota errors already show a notification inside upload() — avoid double-toasting.
                if (!(e instanceof AppError && e.code === AppErrorCode.FILE_TOO_LARGE)) {
                    errors.push(`${file.name}: ${(e as Error).message}`);
                }
            } finally {
                this.uploadingFileNames.update(names => names.filter(n => n !== file.name));
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

    /**
     * Upload a file to Supabase Storage via XMLHttpRequest so we can report
     * real upload progress. The Supabase JS client uses fetch(), which has no
     * progress events in the browser.
     */
    private uploadViaXhr(file: File, storagePath: string, token: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const url = `${this.sb.projectUrl}/storage/v1/object/${BUCKET}/${storagePath}`;
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.setRequestHeader('x-upsert', 'false');

            xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    this.uploadProgress.update(p => ({ ...p, [file.name]: pct }));
                }
            });

            xhr.addEventListener('load', () => {
                this.uploadProgress.update(p => { const n = { ...p }; delete n[file.name]; return n; });
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    let msg = `Upload failed (${xhr.status})`;
                    try {
                        const body = JSON.parse(xhr.responseText);
                        const raw: string = body?.message ?? '';
                        const lower = raw.toLowerCase();
                        msg = lower.includes('not found') || lower.includes('404')
                            ? `Storage bucket not configured. Create a private bucket named "${BUCKET}" in your Supabase dashboard.`
                            : lower.includes('row-level security') || lower.includes('violates')
                                ? 'Storage permissions not configured. Run the storage policy SQL from supabase_schema.sql in your Supabase dashboard.'
                                : raw || msg;
                    } catch { /* non-JSON response */ }
                    reject(new Error(msg));
                }
            });

            xhr.addEventListener('error', () => {
                this.uploadProgress.update(p => { const n = { ...p }; delete n[file.name]; return n; });
                reject(new Error('Network error during upload'));
            });

            xhr.addEventListener('abort', () => {
                this.uploadProgress.update(p => { const n = { ...p }; delete n[file.name]; return n; });
                reject(new Error('Upload aborted'));
            });

            this.uploadProgress.update(p => ({ ...p, [file.name]: 0 }));
            xhr.send(file);
        });
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
