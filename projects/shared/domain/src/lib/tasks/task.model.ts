/**
 * Task Model
 * Core task interface used across the application
 */
export interface Task {
    id: string;
    title: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    hours: string;
    status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
    project?: string;
    due?: string;
    labels?: string[];
    reminders?: string[];
    subtasks?: Task[];
    parentId?: string;
    dependencies?: string[];
    recurring?: {
        pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
        interval?: number;
        endDate?: string;
        nextDue?: string;
    };
    timeSpent?: number; // in minutes
    notes?: string;
    attachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
        uploadedAt: string;
    }>;
    description?: string;
    startDate?: string;
    estimatedDuration?: number;
}
