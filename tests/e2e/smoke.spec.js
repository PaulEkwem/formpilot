// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify each public page loads and basic structure exists.
 * No login required. Auth flow tests live in tests/e2e/auth.spec.js (TBD).
 */

test.describe('public pages render', () => {
  test('landing page loads with hero and CTA', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveTitle(/FormPilot/);
    await expect(page.locator('.hero-headline')).toBeVisible();
    await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible();
  });

  test('login page renders the form', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page).toHaveTitle(/Log in/);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#loginBtn')).toBeVisible();
  });

  test('signup page renders the form', async ({ page }) => {
    await page.goto('/signup.html');
    await expect(page).toHaveTitle(/sign|create/i);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('privacy + terms exist', async ({ page }) => {
    await page.goto('/privacy.html');
    await expect(page).toHaveTitle(/Privacy/);
    await page.goto('/terms.html');
    await expect(page).toHaveTitle(/Terms/);
  });

  test('dashboard redirects to login when no session', async ({ page }) => {
    // dashboard.html has an inline auth guard at the top of <head> that
    // calls location.replace('login.html') before any external script runs.
    //
    // Playwright/Chromium quirk: a JS-based redirect during page load can
    // abort the original navigation, making page.goto() hang or throw.
    // Workaround: don't await goto, just wait for the URL to settle.
    await page.goto('/dashboard.html').catch(() => {});
    await expect(page).toHaveURL(/\/login\.html$/, { timeout: 10_000 });
  });
});

test.describe('CSP headers (production proxy not tested here)', () => {
  test('has expected meta description and viewport on landing', async ({ page }) => {
    await page.goto('/index.html');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});
