export abstract class DataService {
  abstract getAll<T>(collection: string): Promise<T[]>;
  abstract upsert<T>(collection: string, item: T): Promise<void>;
  abstract remove(collection: string, id: string): Promise<void>;

  // Optional: Bulk operations for migration/import
  abstract importData(data: any): Promise<void>;
}
