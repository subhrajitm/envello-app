/**
 * Production environment configuration.
 * Do not put secrets here; use backend or secure vault.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  logLevel: 'warn' as const,
  enableDebugTools: false,
  version: '0.1.0',
  featureFlags: {
    aiSuggestions: false,
    offlineMode: false,
  },
};
