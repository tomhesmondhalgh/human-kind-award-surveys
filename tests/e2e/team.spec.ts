
import { test, expect } from '@playwright/test';
import { AuthHelper } from './utils/auth';
import { TeamHelper } from './utils/team';

test.describe('Team Management', () => {
  let authHelper: AuthHelper;
  let teamHelper: TeamHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    teamHelper = new TeamHelper(page);
    
    // Sign in as admin user for team management tests
    await authHelper.signIn('admin@example.com', 'AdminPassword123!');
  });

  test('should display team page correctly', async ({ page }) => {
    await teamHelper.navigateToTeam();
    
    // Should show team management header
    await expect(page.locator('h1')).toContainText('Team Management');
    
    // Should show current organisation info
    await expect(page.locator('[data-testid="current-organisation"]')).toBeVisible();
    
    // Should show stats cards
    await expect(page.locator('[data-testid="total-members-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-count-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-invitations-stat"]')).toBeVisible();
  });

  test('should invite new team member', async ({ page }) => {
    await teamHelper.navigateToTeam();
    
    const inviteEmail = `invite-${Date.now()}@example.com`;
    
    await teamHelper.inviteMember(inviteEmail, 'editor');
    
    // Should see the invitation in pending invitations
    await expect(page.locator('[data-testid="pending-invitation"]')).toContainText(inviteEmail);
  });

  test('should remove team member', async ({ page }) => {
    await teamHelper.navigateToTeam();
    
    const initialMemberCount = await teamHelper.getMemberCount();
    
    if (initialMemberCount > 1) {
      // Remove a member (not the current user)
      const memberToRemove = page.locator('[data-testid="member-row"]').nth(1);
      const memberEmail = await memberToRemove.getAttribute('data-email');
      
      if (memberEmail) {
        await teamHelper.removeMember(memberEmail);
        
        // Member count should decrease
        const newMemberCount = await teamHelper.getMemberCount();
        expect(newMemberCount).toBe(initialMemberCount - 1);
      }
    }
  });

  test('should not allow non-admin to invite members', async ({ page }) => {
    // Sign out and sign in as non-admin user
    await authHelper.signOut();
    await authHelper.signIn('viewer@example.com', 'ViewerPassword123!');
    
    await teamHelper.navigateToTeam();
    
    // Invite button should not be visible
    await expect(page.locator('[data-testid="invite-member-button"]')).not.toBeVisible();
  });

  test('should resend invitation', async ({ page }) => {
    await teamHelper.navigateToTeam();
    
    // First create an invitation
    const inviteEmail = `resend-${Date.now()}@example.com`;
    await teamHelper.inviteMember(inviteEmail, 'viewer');
    
    // Then resend it
    const invitationRow = page.locator(`[data-testid="pending-invitation"][data-email="${inviteEmail}"]`);
    await invitationRow.locator('[data-testid="resend-invitation-button"]').click();
    
    // Should show success message
    await expect(page.locator('.sonner-toast')).toContainText('Invitation email resent successfully');
  });
});
