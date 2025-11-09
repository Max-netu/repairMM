-- Migration: update_user_roles_only
-- Created at: 1762692099

-- Update existing user roles to match new workflow (club -> hall)
UPDATE users SET role = 'hall' WHERE role = 'club';;