-- Create user roles system with proper security
-- Step 1: Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for user_roles
-- Only admins can view all roles
CREATE POLICY "user_roles_admin_view_all" ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Only admins can manage roles
CREATE POLICY "user_roles_admin_manage" ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Step 5: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 6: Create convenience function for checking admin status
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Step 7: Migrate existing admin users from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, 'admin'::app_role, created_at
FROM public.profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 8: Create index for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Step 9: Add comment for documentation
COMMENT ON TABLE public.user_roles IS 'Stores user roles using security definer pattern to prevent privilege escalation';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check if user has specific role, prevents RLS recursion';
COMMENT ON FUNCTION public.is_admin IS 'Convenience function to check admin status using security definer pattern';