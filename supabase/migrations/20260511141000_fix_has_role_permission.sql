-- Grant execute permission on has_role to anonymous users
-- This prevents "permission denied for function has_role" when evaluating RLS policies for deslogado users
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon, authenticated;
