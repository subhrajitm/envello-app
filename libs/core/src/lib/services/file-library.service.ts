import { Injectable, inject, signal } from '@angular/core';
import { DataService } from '@envello/data';
import { LibraryFile } from '@envello/domain';
import { SupabaseService } from './supabase.service';

export type { LibraryFile };

const BUCKET = 'library';
const MAX_SIZE_BYTES = 52_428_800; // 50 MB

@Injectable({ providedIn: 'root' })
export class FileLibraryService {
    private sb = inject(SupabaseService);
    private db = inject(DataService);

    files = signal<LibraryFile[]>([]);
    uploading = signal(false);

    constructor() {
        this.load();
    }

    private async load() {
        const files = await this.db.getAll<LibraryFile>('library_files');
        this.files.set((files ?? []).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
    }

    async upload(
        file: File,
        source?: { type: LibraryFile['sourceType']; id: string },
    ): Promise<LibraryFile> {
        if (file.size > MAX_SIZE_BYTES) {
            throw new Error(`File "${file.name}" exceeds the 50 MB limit.`);
        }

        const { data: { user } } = await this.sb.client.auth.getUser();
        const userId = user?.id ?? 'anonymous';
        const fileId = crypto.randomUUID();
        const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
        const storagePath = `${userId}/${fileId}${ext ? '.' + ext : ''}`;

        const { error: uploadError } = await this.sb.client.storage
            .from(BUCKET)
            .upload(storagePath, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

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
    ): Promise<LibraryFile[]> {
        this.uploading.set(true);
        try {
            return await Promise.all(files.map(f => this.upload(f, source)));
        } finally {
            this.uploading.set(false);
        }
    }

    async delete(fileId: string): Promise<void> {
        const file = this.files().find(f => f.id === fileId);
        if (!file) return;

        await this.sb.client.storage.from(BUCKET).remove([file.storagePath]);
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
