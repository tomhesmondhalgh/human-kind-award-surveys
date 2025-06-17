
import { Page, expect } from '@playwright/test';

export class TeamHelper {
  constructor(private page: Page) {}

  async navigateToTeam() {
    await this.page.goto('/team');
    await expect(this.page.locator('[data-testid="team-page"]')).toBeVisible();
  }

  async inviteMember(email: string, role: 'admin' | 'editor' | 'viewer' = 'viewer') {
    await this.page.click('[data-testid="invite-member-button"]');
    
    await this.page.fill('[data-testid="invite-email-input"]', email);
    await this.page.selectOption('[data-testid="invite-role-select"]', role);
    
    await this.page.click('[data-testid="send-invitation-button"]');
    
    // Wait for success toast
    await expect(this.page.locator('.sonner-toast')).toContainText('Invitation sent successfully');
  }

  async removeMember(memberEmail: string) {
    const memberRow = this.page.locator(`[data-testid="member-row"][data-email="${memberEmail}"]`);
    await memberRow.locator('[data-testid="remove-member-button"]').click();
    
    // Confirm removal
    await this.page.click('[data-testid="confirm-remove-button"]');
    
    // Wait for success toast
    await expect(this.page.locator('.sonner-toast')).toContainText('Team member removed');
  }

  async getMemberCount(): Promise<number> {
    const members = await this.page.locator('[data-testid="member-row"]').count();
    return members;
  }

  async getPendingInvitationsCount(): Promise<number> {
    const invitations = await this.page.locator('[data-testid="pending-invitation"]').count();
    return invitations;
  }
}
