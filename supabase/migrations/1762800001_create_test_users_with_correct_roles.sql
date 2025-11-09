-- Migration: create_test_users_with_correct_roles
-- Created at: 1762800001
-- Create test users with correct roles for the application

-- First, ensure we have a club
INSERT INTO clubs (id, name, city, address) 
VALUES (1, 'Test Club', 'Zagreb', 'Test Address 123')
ON CONFLICT (id) DO NOTHING;

-- Create test users with different roles
INSERT INTO users (id, name, email, role, club_id, active, created_at) VALUES
(1, 'Test Admin', 'admin@test.com', 'admin', NULL, true, NOW()),
(2, 'Test Technician', 'technician@test.com', 'technician', 1, true, NOW()),
(3, 'Test Hall User', 'hall@test.com', 'hall', 1, true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  club_id = EXCLUDED.club_id,
  active = EXCLUDED.active;

-- Create some test machines for the club
INSERT INTO machines (id, club_id, number, model, location) VALUES
(1, 1, '001', 'APEX Slot Machine', 'Hall A'),
(2, 1, '002', 'NOVOMATIC Gaming', 'Hall B')
ON CONFLICT (id) DO NOTHING;

-- Note: Passwords need to be set separately as they are hashed with SHA-256
-- Test credentials:
-- Admin: admin@test.com / admin123
-- Technician: technician@test.com / tech123
-- Hall User: hall@test.com / hall123