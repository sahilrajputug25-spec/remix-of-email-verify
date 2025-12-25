
-- Fix RLS Security Issues
-- Since this app uses custom session-based auth (not Supabase Auth), 
-- we restrict direct table access and rely on SECURITY DEFINER functions

-- 1. credential_keys - No public read access (only via RPC functions)
DROP POLICY IF EXISTS "Anyone can check if a key exists" ON credential_keys;
CREATE POLICY "No direct access to credential_keys"
ON credential_keys FOR SELECT
TO authenticated, anon
USING (false);

-- 2. user_sessions - No public read access (only via RPC functions)
DROP POLICY IF EXISTS "Anyone can check sessions" ON user_sessions;
DROP POLICY IF EXISTS "Allow session creation" ON user_sessions;
DROP POLICY IF EXISTS "Allow session updates" ON user_sessions;

CREATE POLICY "No direct select on user_sessions"
ON user_sessions FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "No direct insert on user_sessions"
ON user_sessions FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No direct update on user_sessions"
ON user_sessions FOR UPDATE
TO authenticated, anon
USING (false);

-- 3. activity_logs - No public read access (only via admin RPC functions)
DROP POLICY IF EXISTS "Admins can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow activity log inserts" ON activity_logs;

CREATE POLICY "No direct select on activity_logs"
ON activity_logs FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "No direct insert on activity_logs"
ON activity_logs FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- 4. email_validations - Only allow access via RPC or restrict to own data
DROP POLICY IF EXISTS "Anyone can view validations" ON email_validations;
DROP POLICY IF EXISTS "Anyone can insert validations" ON email_validations;
DROP POLICY IF EXISTS "Anyone can delete validations" ON email_validations;

CREATE POLICY "No direct select on email_validations"
ON email_validations FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "No direct insert on email_validations"
ON email_validations FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No direct delete on email_validations"
ON email_validations FOR DELETE
TO authenticated, anon
USING (false);

-- 5. bulk_uploads - No public access
DROP POLICY IF EXISTS "Anyone can view bulk uploads" ON bulk_uploads;
DROP POLICY IF EXISTS "Anyone can insert bulk uploads" ON bulk_uploads;
DROP POLICY IF EXISTS "Anyone can update bulk uploads" ON bulk_uploads;
DROP POLICY IF EXISTS "Anyone can delete bulk uploads" ON bulk_uploads;

CREATE POLICY "No direct select on bulk_uploads"
ON bulk_uploads FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "No direct insert on bulk_uploads"
ON bulk_uploads FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No direct update on bulk_uploads"
ON bulk_uploads FOR UPDATE
TO authenticated, anon
USING (false);

CREATE POLICY "No direct delete on bulk_uploads"
ON bulk_uploads FOR DELETE
TO authenticated, anon
USING (false);

-- 6. subscriptions - No public access
DROP POLICY IF EXISTS "Anyone can view subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can update subscriptions" ON subscriptions;

CREATE POLICY "No direct select on subscriptions"
ON subscriptions FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "No direct insert on subscriptions"
ON subscriptions FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No direct update on subscriptions"
ON subscriptions FOR UPDATE
TO authenticated, anon
USING (false);

-- 7. user_roles - No public access
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;

CREATE POLICY "No direct select on user_roles"
ON user_roles FOR SELECT
TO authenticated, anon
USING (false);
