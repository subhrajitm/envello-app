import { __decorate } from 'tslib';
import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
let PouchDbDataService = class PouchDbDataService {
  dbs = {};
  getDb(collection) {
    if (!this.dbs[collection]) {
      // We use 'envello_' prefix so the IndexedDB instances don't collide broadly
      this.dbs[collection] = new PouchDB(`envello_${collection}`);
    }
    return this.dbs[collection];
  }
  async getAll(collection) {
    try {
      const db = this.getDb(collection);
      const result = await db.allDocs({ include_docs: true });
      // The document inside PouchDB has _id and _rev, plus our item fields.
      // We map out the pure doc object.
      return result.rows.map((row) => row.doc);
    } catch (e) {
      console.error(
        `[PouchDbDataService] Failed to get all from ${collection}`,
        e,
      );
      return [];
    }
  }
  async upsert(collection, item) {
    try {
      const db = this.getDb(collection);
      const docId = item.id;
      if (!docId) {
        console.warn(
          `[PouchDbDataService] Item missing 'id' property. PouchDB requires _id. Upsert failed for ${collection}.`,
        );
        return;
      }
      try {
        const existing = await db.get(docId);
        // Put updating the properties and ensuring we send the current _rev
        await db.put({
          ...item,
          _id: docId,
          _rev: existing._rev,
        });
      } catch (err) {
        if (err.name === 'not_found' || err.status === 404) {
          // Item doesn't exist, create it anew
          await db.put({
            ...item,
            _id: docId,
          });
        } else {
          throw err; // Propagate real errors
        }
      }
    } catch (e) {
      console.error(
        `[PouchDbDataService] Failed to upsert to ${collection}`,
        e,
      );
    }
  }
  async remove(collection, id) {
    try {
      const db = this.getDb(collection);
      const existing = await db.get(id);
      await db.remove(existing._id, existing._rev);
    } catch (err) {
      // If it's not found, it's already 'removed' essentially. Ignore 404s.
      if (err.name !== 'not_found' && err.status !== 404) {
        console.error(
          `[PouchDbDataService] Failed to remove ${id} from ${collection}`,
          err,
        );
      }
    }
  }
  async importData(data) {
    // Reserved for bulk import implementation scaling.
    console.log('[PouchDbDataService] importData invoked.', data);
  }
};
PouchDbDataService = __decorate(
  [
    Injectable({
      providedIn: 'root',
    }),
  ],
  PouchDbDataService,
);
export { PouchDbDataService };
