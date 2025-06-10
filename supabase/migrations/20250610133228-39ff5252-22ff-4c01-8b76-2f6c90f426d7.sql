
-- ==========================================
-- CORE USER DATA POLICIES (Phase 1)
-- ==========================================

-- 1. PROFILES TABLE POLICIES
-- Users can only view and manage their own profile data
CREATE POLICY "profiles_view_own" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- 2. SUBSCRIPTIONS TABLE POLICIES  
-- Users can only view their own subscriptions
CREATE POLICY "subscriptions_view_own" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 3. PAYMENT_HISTORY TABLE POLICIES
-- Users can view their own payment history, admins can view all
CREATE POLICY "payment_history_view_own" 
  ON public.payment_history 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT s.user_id 
      FROM public.subscriptions s 
      WHERE s.id = payment_history.subscription_id
    )
  );

CREATE POLICY "payment_history_admin_view_all" 
  ON public.payment_history 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 4. ORGANIZATIONS TABLE POLICIES
-- Use the existing security definer functions for organization access
CREATE POLICY "orgs_view_members" 
  ON public.organizations 
  FOR SELECT 
  USING (
    public.user_is_organization_member(auth.uid(), id)
  );

CREATE POLICY "orgs_create_authenticated" 
  ON public.organizations 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "orgs_update_admins" 
  ON public.organizations 
  FOR UPDATE 
  USING (
    public.user_has_organization_role(auth.uid(), id, 'admin')
  );

CREATE POLICY "orgs_delete_admins" 
  ON public.organizations 
  FOR DELETE 
  USING (
    public.user_has_organization_role(auth.uid(), id, 'admin')
  );

-- ==========================================
-- ADMIN-ONLY TABLES (Phase 2)
-- ==========================================

-- 5. PLANS TABLE POLICIES
-- Public read access for pricing display, admin-only write access
CREATE POLICY "plans_public_read" 
  ON public.plans 
  FOR SELECT 
  USING (true);

CREATE POLICY "plans_admin_create" 
  ON public.plans 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "plans_admin_update" 
  ON public.plans 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "plans_admin_delete" 
  ON public.plans 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 6. REDEMPTION_CODES TABLE POLICIES
-- Admin-only access for code management
CREATE POLICY "redemption_codes_admin_all" 
  ON public.redemption_codes 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 7. REDEMPTIONS TABLE POLICIES
-- Users can view their own redemptions, create new ones, admins can view all
CREATE POLICY "redemptions_view_own" 
  ON public.redemptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "redemptions_create_own" 
  ON public.redemptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "redemptions_admin_view_all" 
  ON public.redemptions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ==========================================
-- PUBLIC ACCESS TABLES (Phase 3)
-- ==========================================

-- 8. SCHOOLS TABLE POLICIES
-- Public read access for school search functionality
CREATE POLICY "schools_public_read" 
  ON public.schools 
  FOR SELECT 
  USING (true);

-- 9. CUSTOM_SCRIPTS TABLE POLICIES
-- Admin-only access for custom script management
CREATE POLICY "custom_scripts_admin_all" 
  ON public.custom_scripts 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ==========================================
-- ORGANIZATION SUPPORT TABLES (Phase 4)
-- ==========================================

-- 10. ORGANIZATION_INVITATIONS TABLE POLICIES
-- Users can view invitations sent to their email, org admins can manage invitations
CREATE POLICY "org_invitations_view_own_email" 
  ON public.organization_invitations 
  FOR SELECT 
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "org_invitations_admin_manage" 
  ON public.organization_invitations 
  FOR ALL 
  USING (
    public.user_can_manage_org_membership(auth.uid(), organization_id)
  )
  WITH CHECK (
    public.user_can_manage_org_membership(auth.uid(), organization_id)
  );

-- 11. ORGANIZATION_GROUPS TABLE POLICIES
-- Public read access for group information
CREATE POLICY "org_groups_public_read" 
  ON public.organization_groups 
  FOR SELECT 
  USING (true);

-- 12. ORGANIZATION_GROUP_MEMBERSHIPS TABLE POLICIES
-- Organization admins can manage group memberships
CREATE POLICY "org_group_memberships_admin_manage" 
  ON public.organization_group_memberships 
  FOR ALL 
  USING (
    public.user_has_organization_role(auth.uid(), organization_id, 'admin')
  )
  WITH CHECK (
    public.user_has_organization_role(auth.uid(), organization_id, 'admin')
  );
