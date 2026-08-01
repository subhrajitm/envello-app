export default {
  displayName: 'core',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/libs/core',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@powersync|pouchdb|.*\\.mjs$))'],
  moduleNameMapper: {
    // ESM-only packages that can't load in jsdom — replace with empty stubs
    '^@powersync/web$':    '<rootDir>/src/__mocks__/powersync-web.ts',
    '^@powersync/common$': '<rootDir>/src/__mocks__/powersync-common.ts',
    '^pouchdb$':           '<rootDir>/src/__mocks__/pouchdb.ts',
  },
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ]
};
