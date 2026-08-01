import { test, expect } from '@playwright/test';
import { loginAsGuest } from './helpers';

test.describe('App navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
  });

  test('keyboard shortcut ? opens the cheat-sheet', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog').filter({ hasText: /keyboard shortcuts/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog').filter({ hasText: /keyboard shortcuts/i })).not.toBeVisible();
  });

  test('header renders nav items', async ({ page }) => {
    const header = page.getByRole('banner');
    await expect(header).toBeVisible();
  });

  test('navigating to /tasks renders the task view', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByText(/no tasks yet|add task|inbox/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('navigating to /daily-notes renders the notes view', async ({ page }) => {
    await page.goto('/daily-notes');
    await expect(page.getByText(/personal|no notes|new note/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('navigating to /bookmarks renders the bookmarks view', async ({ page }) => {
    await page.goto('/bookmarks');
    await expect(page.getByText(/bookmark|no bookmarks/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('footer shows sync status', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    // Sync dot should be in one of the known states
    await expect(footer.locator('.footer-sync-btn')).toBeVisible();
  });
});
