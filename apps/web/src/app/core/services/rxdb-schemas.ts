export const SCHEMAS = {
    tasks: {
        title: 'tasks schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            title: { type: 'string' },
            priority: { type: 'string' }, // 'HIGH' | 'MEDIUM' | 'LOW'
            hours: { type: 'string' },
            status: { type: 'string' }, // 'ACTIVE' | 'COMPLETED' | 'PENDING'
            project: { type: 'string' },
            due: { type: 'string' },
            labels: { type: 'array', items: { type: 'string' } },
            reminders: { type: 'array', items: { type: 'string' } },
            subtasks: { type: 'array', items: { type: 'object' } }, // recursive structure handling might need care
            parentId: { type: 'string' },
            dependencies: { type: 'array', items: { type: 'string' } },
            recurring: { type: 'object' },
            timeSpent: { type: 'number' },
            notes: { type: 'string' },
            attachments: { type: 'array', items: { type: 'object' } },
            description: { type: 'string' },
            startDate: { type: 'string' },
            estimatedDuration: { type: 'number' }
        },
        required: ['id', 'title']
    },
    notes: {
        title: 'notes schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            date: { type: 'string' },
            title: { type: 'string' },
            preview: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            lastEdited: { type: 'string' },
            filePath: { type: 'string' },
            lastSynced: { type: 'string' }
        },
        required: ['id', 'title']
    },
    planning_items: {
        title: 'planning items schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            title: { type: 'string' },
            tag: { type: 'string' },
            stage: { type: 'string' },
            active: { type: 'boolean' }
        },
        required: ['id']
    },
    activities: {
        title: 'activities schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            text: { type: 'string' },
            time: { type: 'string' },
            type: { type: 'string' }
        },
        required: ['id']
    },
    novels: {
        title: 'novels schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            title: { type: 'string' },
            icon: { type: 'string' },
            status: { type: 'string' },
            wordCount: { type: 'number' },
            targetWordCount: { type: 'number' },
            progress: { type: 'number' },
            chapters: { type: 'number' },
            notesCount: { type: 'number' },
            createdDate: { type: 'string' },
            lastUpdated: { type: 'string' },
            genre: { type: 'array', items: { type: 'string' } },
            isRecentlyUpdated: { type: 'boolean' },
            coverImage: { type: 'string' }
        },
        required: ['id']
    },
    novel_content: {
        title: 'novel content schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            data: { type: 'string' }
        },
        required: ['id']
    },
    bin_items: {
        title: 'bin items schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            type: { type: 'string' },
            originalId: { type: 'string' },
            contextId: { type: 'string' },
            title: { type: 'string' },
            deletedAt: { type: 'string' },
            payload: { type: 'object' } // Flexible payload storage
        },
        required: ['id']
    },
    snippets: {
        title: 'snippets schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            title: { type: 'string' },
            lang: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            content: { type: 'string' },
            filename: { type: 'string' },
            path: { type: 'string' },
            creator: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
        },
        required: ['id']
    },
    books: {
        title: 'books schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            title: { type: 'string' },
            author: { type: 'string' },
            category: { type: 'string' },
            status: { type: 'string' },
            progress: { type: 'number' },
            notesCount: { type: 'number' },
            lastAccessed: { type: 'string' },
            coverImage: { type: 'string' },
            isbn: { type: 'string' },
            year: { type: 'number' },
            notes: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
        },
        required: ['id']
    },
    meetings: {
        title: 'meetings schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            title: { type: 'string' },
            description: { type: 'string' },
            project: { type: 'string' },
            date: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            duration: { type: 'number' },
            timezone: { type: 'string' },
            location: { type: 'string' },
            meetingLink: { type: 'string' },
            meetingType: { type: 'string' },
            platform: { type: 'string' },
            attendees: { type: 'array', items: { type: 'object' } },
            organizer: { type: 'object' },
            agenda: { type: 'array', items: { type: 'object' } },
            notes: { type: 'array', items: { type: 'object' } },
            actionItems: { type: 'array', items: { type: 'object' } },
            status: { type: 'string' },
            priority: { type: 'string' },
            color: { type: 'string' },
            labels: { type: 'array', items: { type: 'string' } },
            recurring: { type: 'object' },
            reminders: { type: 'array', items: { type: 'object' } },
            attachments: { type: 'array', items: { type: 'object' } },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            createdBy: { type: 'string' }
        },
        required: ['id']
    },
    articles: {
        title: 'articles schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            title: { type: 'string' },
            platform: { type: 'string' },
            pipeline: { type: 'string' },
            wordCount: { type: 'number' },
            content: { type: 'string' },
            url: { type: 'string' },
            scheduledDate: { type: 'string' },
            engagement: { type: 'object' },
            tags: { type: 'array', items: { type: 'string' } },
            lastUpdated: { type: 'string' },
            createdDate: { type: 'string' },
            icon: { type: 'string' },
            excerpt: { type: 'string' }
        },
        required: ['id']
    },
    journal_projects: {
        title: 'journal projects schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            title: { type: 'string' },
            description: { type: 'string' },
            entriesCount: { type: 'number' },
            active: { type: 'boolean' },
            wordCount: { type: 'number' },
            targetWordCount: { type: 'number' },
            progress: { type: 'number' },
            createdDate: { type: 'string' },
            lastUpdated: { type: 'string' },
            columns: { type: 'array', items: { type: 'object' } },
            tags: { type: 'array', items: { type: 'string' } },
            isLocked: { type: 'boolean' }
        },
        required: ['id']
    },
    journal_entries: {
        title: 'journal entries schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            projectId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            preview: { type: 'string' },
            type: { type: 'string' },
            column: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            wordCount: { type: 'number' },
            characterCount: { type: 'number' },
            createdDate: { type: 'string' },
            lastEdited: { type: 'string' },
            hasAi: { type: 'boolean' },
            isAiEdited: { type: 'boolean' },
            progress: { type: 'number' },
            statusColor: { type: 'string' },
            meta: { type: 'object', additionalProperties: true },
            isLocked: { type: 'boolean' },
            linkedEntries: { type: 'array', items: { type: 'string' } },
            isPinned: { type: 'boolean' },
            isFavorite: { type: 'boolean' }
        },
        required: ['id']
    },
    journal_columns: {
        title: 'journal columns schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            name: { type: 'string' },
            color: { type: 'string' },
            order: { type: 'number' }
        },
        required: ['id']
    },
    research_libraries: {
        title: 'research libraries schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            name: { type: 'string' },
            description: { type: 'string' },
            color: { type: 'string' },
            createdDate: { type: 'string' },
            lastModified: { type: 'string' }
        },
        required: ['id']
    },
    research_sources: {
        title: 'research sources schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            libraryId: { type: 'string' },
            title: { type: 'string' },
            sourceType: { type: 'string' },
            url: { type: 'string' },
            description: { type: 'string' },
            author: { type: 'string' },
            publishDate: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            status: { type: 'string' },
            notes: { type: 'string' },
            createdDate: { type: 'string' },
            lastAccessed: { type: 'string' }
        },
        required: ['id']
    },
    research_summaries: {
        title: 'research summaries schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 },
            libraryId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            sourceIds: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            createdDate: { type: 'string' },
            lastModified: { type: 'string' }
        },
        required: ['id']
    },
    files: {
        title: 'files schema',
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 100 }, // category_fileId
            category: { type: 'string' },
            fileId: { type: 'string' },
            content: { type: 'string' },
            lastModified: { type: 'string' }
        },
        required: ['id', 'category', 'fileId', 'content']
    }
};
