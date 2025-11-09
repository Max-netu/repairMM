-- Migration: update_user_roles_to_hall
-- Created at: 1762692086

-- Update role constraint to allow "hall" instead of "club"
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'technician', 'hall'));

-- Update existing user roles to match new workflow (club -> hall)
UPDATE users SET role = 'hall' WHERE role = 'club';

-- Create RLS policies for the new workflow
-- Enable RLS on all tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;;