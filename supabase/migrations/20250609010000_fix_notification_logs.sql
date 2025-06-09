-- Migration: Fix notification_logs table to allow system events
-- Description: Allow null user_id for system events like cron runs

-- Drop the foreign key constraint temporarily  
ALTER TABLE notification_logs DROP CONSTRAINT notification_logs_user_id_fkey;

-- Modify the user_id column to allow NULL
ALTER TABLE notification_logs ALTER COLUMN user_id DROP NOT NULL;

-- Add back the foreign key constraint, but allow null values
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update RLS policy to allow system events (null user_id)
DROP POLICY IF EXISTS "Users can view their own notification logs" ON notification_logs;

CREATE POLICY "Users can view their own notification logs" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow service role to insert system events
CREATE POLICY "Service role can insert system events" ON notification_logs
  FOR INSERT WITH CHECK (
    -- Service role can insert anything
    auth.jwt() ->> 'role' = 'service_role' OR
    -- Users can only insert their own notifications  
    auth.uid() = user_id
  );

-- Index for system events
CREATE INDEX IF NOT EXISTS idx_notification_logs_system_events 
  ON notification_logs(notification_type, sent_at) 
  WHERE user_id IS NULL; 