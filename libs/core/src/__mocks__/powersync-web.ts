// Stub for @powersync/web — ESM-only package, replaced in jest environment.
// Must export all names used across the codebase that import from this package.

export const PowerSyncDatabase   = jest.fn();
export const WASQLiteOpenFactory = jest.fn();
export const AbstractPowerSyncDatabase = jest.fn();

// column utility — used in powersync.schema.ts
export const column = {
  text:    'text',
  integer: 'integer',
  real:    'real',
};

export class Table {
  constructor(public columns: any = {}, public options: any = {}) {}
}

export class Schema {
  constructor(public tables: any = {}) {}
}
