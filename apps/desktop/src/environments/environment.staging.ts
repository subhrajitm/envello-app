/**
 * Staging environment configuration.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  logLevel: 'info' as const,
  enableDebugTools: false,
  version: '0.1.1-staging',
  featureFlags: {
    aiSuggestions: true,
    offlineMode: false,
  },
  powerSyncUrl: 'https://6a23035e0ef84ed6719f380d.powersync.journeyapps.com',
};
