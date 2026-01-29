/**
 * Development environment configuration.
 * Do not put secrets here; use backend or secure vault.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  logLevel: 'debug' as const,
  enableDebugTools: true,
  version: '0.1.0-dev',
  featureFlags: {
    aiSuggestions: true,
    offlineMode: false,
  },
};
