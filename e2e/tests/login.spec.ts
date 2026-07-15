import { test, expect } from '@playwright/test';
import { loginAsGuest } from './helpers';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows the login form', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows validation error when submitting empty form', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/please fill in all fields/i)).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/password/i).fill('somepassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/valid email address/i)).toBeVisible();
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials|login failed/i)).toBeVisible({ timeout: 10_000 });
  });

  test('sign-up form enforces minimum password length', async ({ page }) => {
    // Switch to sign-up mode if there's a toggle
    const signUpBtn = page.getByRole('button', { name: /sign up|create account/i }).first();
    if (await signUpBtn.isVisible()) {
      await signUpBtn.click();
    }
    await page.getByLabel(/email/i).fill('new@example.com');
    await page.getByLabel(/password/i).fill('short');
    await page.getByRole('button', { name: /sign up|create/i }).first().click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });
});

test.describe('Guest mode', () => {
  test('can continue as guest and land on workspace', async ({ page }) => {
    await loginAsGuest(page);
    await expect(page).toHaveURL(/\/workspace/);
  });
});
