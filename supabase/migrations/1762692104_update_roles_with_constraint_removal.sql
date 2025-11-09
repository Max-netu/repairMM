-- Migration: update_roles_with_constraint_removal
-- Created at: 1762692104

-- Temporarily drop the role constraint
ALTER TABLE users DROP CONSTRAINT users_role_check;

-- Update existing user roles to match new workflow (club -> hall)
UPDATE users SET role = 'hall' WHERE role = 'club';

-- Add the new constraint with the updated role values
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'technician', 'hall'));

-- Enable RLS on all tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;;