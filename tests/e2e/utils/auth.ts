
import { Page, expect } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async signUp(email: string, password: string, firstName: string, lastName: string, schoolName: string) {
    await this.page.goto('/signup');
    
    // Fill personal details
    await this.page.fill('[data-testid="first-name-input"]', firstName);
    await this.page.fill('[data-testid="last-name-input"]', lastName);
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    
    // Continue to professional details
    await this.page.click('[data-testid="continue-button"]');
    
    // Fill professional details
    await this.page.fill('[data-testid="school-name-input"]', schoolName);
    await this.page.selectOption('[data-testid="job-title-select"]', 'Headteacher');
    
    // Submit form
    await this.page.click('[data-testid="signup-submit-button"]');
    
    // Wait for redirect or success message
    await expect(this.page).toHaveURL('/dashboard');
  }

  async signIn(email: string, password: string) {
    await this.page.goto('/login');
    
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-submit-button"]');
    
    // Wait for successful login
    await expect(this.page).toHaveURL('/dashboard');
  }

  async signOut() {
    await this.page.click('[data-testid="settings-dropdown"]');
    await this.page.click('[data-testid="sign-out-button"]');
    
    // Wait for redirect to home page
    await expect(this.page).toHaveURL('/');
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.locator('[data-testid="settings-dropdown"]').waitFor({ timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}
