
import { test, expect } from '@playwright/test';
import { AuthHelper } from './utils/auth';

test.describe('Authentication', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should sign up new user successfully', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    const firstName = 'Test';
    const lastName = 'User';
    const schoolName = 'Test School';

    await authHelper.signUp(email, password, firstName, lastName, schoolName);
    
    // Should be redirected to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Should see welcome message or dashboard content
    await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();
  });

  test('should sign in existing user', async ({ page }) => {
    // This test would need a test user created in setup
    const email = 'testuser@example.com';
    const password = 'TestPassword123!';

    await authHelper.signIn(email, password);
    
    // Should be on dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit-button"]');
    
    // Should show error message
    await expect(page.locator('.sonner-toast')).toContainText('Failed to log in');
  });

  test('should sign out user successfully', async ({ page }) => {
    // First sign in
    await authHelper.signIn('testuser@example.com', 'TestPassword123!');
    
    // Then sign out
    await authHelper.signOut();
    
    // Should be redirected to home page
    await expect(page).toHaveURL('/');
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});
