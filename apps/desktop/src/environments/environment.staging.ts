/**
 * Staging environment configuration.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  logLevel: 'info' as const,
  enableDebugTools: false,
  version: '0.1.0-staging',
  featureFlags: {
    aiSuggestions: true,
    offlineMode: false,
  },
  powerSyncUrl: '',
};
