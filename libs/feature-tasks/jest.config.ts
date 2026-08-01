export default {
  displayName: 'feature-tasks',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/libs/feature-tasks',
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
    '^@powersync/web$':    '<rootDir>/../core/src/__mocks__/powersync-web.ts',
    '^@powersync/common$': '<rootDir>/../core/src/__mocks__/powersync-common.ts',
    '^pouchdb$':           '<rootDir>/../core/src/__mocks__/pouchdb.ts',
  },
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ]
};
