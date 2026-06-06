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
  supabase: {
    url: 'https://lseubltuyinvyexshqsn.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXVibHR1eWludnlleHNocXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjcyMjUsImV4cCI6MjA4NTcwMzIyNX0.JFgFAEH373X477zHIaD6ZkUc1MC3j7dHeUSvRTPI-xI'
  },
  powerSyncUrl: '',
};
