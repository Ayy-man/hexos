-- Allow users to read their own profile
-- This is needed for the signIn action and dashboard access

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Also allow users to update their own profile (name, etc.)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);
