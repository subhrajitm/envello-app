import { Page } from '@playwright/test';

/** Credentials wired in .env.test or Supabase local dev. */
export const TEST_EMAIL    = process.env['E2E_EMAIL']    ?? 'e2e@envello.test';
export const TEST_PASSWORD = process.env['E2E_PASSWORD'] ?? 'TestPassword123!';

/** Log in with email/password and wait for the workspace to be visible. */
export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for the main shell — either the header nav or the router outlet
  await page.waitForURL(/\/(workspace|tasks|daily-notes|knowledge|bookmarks)/, { timeout: 15_000 });
}

/** Continue as guest (no account required). */
export async function loginAsGuest(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /continue as guest/i }).click();
  await page.waitForURL(/\/workspace/, { timeout: 10_000 });
}
