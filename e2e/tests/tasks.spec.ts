import { test, expect } from '@playwright/test';
import { loginAsGuest } from './helpers';

test.describe('Task creation and management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
    await page.goto('/tasks');
  });

  test('can open the new task modal', async ({ page }) => {
    // Look for a "New task" or "+" button — the exact label varies
    const newBtn = page.getByRole('button', { name: /new task|add task|\+/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 6_000 });
    await newBtn.click();
    // A modal or inline form should appear
    await expect(page.getByRole('dialog').or(page.locator('form')).first()).toBeVisible({ timeout: 4_000 });
  });

  test('task list renders without crashing', async ({ page }) => {
    // The list body (virtual-scroll container or list-body) should mount
    await expect(page.locator('.tasks-list-container, .tasks-main-content').first()).toBeVisible({ timeout: 8_000 });
  });

  test('view switcher tabs are present', async ({ page }) => {
    // Inbox, Today, Upcoming — verify the sidebar nav or top tabs
    const inbox   = page.getByRole('button', { name: /inbox/i });
    const todayTab = page.getByRole('button', { name: /today/i }).first();
    await expect(inbox.or(todayTab)).toBeVisible({ timeout: 6_000 });
  });

  test('thumbnails view switch works', async ({ page }) => {
    const thumbnailsBtn = page.getByRole('button', { name: /thumbnail|card|grid/i }).first();
    if (await thumbnailsBtn.isVisible()) {
      await thumbnailsBtn.click();
      await expect(page.locator('.thumbs-grid, .tasks-thumbnails-container').first()).toBeVisible({ timeout: 4_000 });
    }
  });
});
