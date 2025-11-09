-- Migration: update_user_roles_and_rls_policies
-- Created at: 1762692074

-- Update existing user roles to match new workflow (club -> hall)
UPDATE users SET role = 'hall' WHERE role = 'club';

-- Create RLS policies for the new workflow
-- Enable RLS on all tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Tickets: Public read access" ON tickets;
DROP POLICY IF EXISTS "Tickets: Service role can manage" ON tickets;
DROP POLICY IF EXISTS "Users: Public read access" ON users;
DROP POLICY IF EXISTS "Users: Service role can manage" ON users;
DROP POLICY IF EXISTS "Clubs: Public read access" ON clubs;
DROP POLICY IF EXISTS "Clubs: Service role can manage" ON clubs;
DROP POLICY IF EXISTS "Machines: Public read access" ON machines;
DROP POLICY IF EXISTS "Machines: Service role can manage" ON machines;

-- Create new role-based policies for tickets
-- Hall users can only see and manage tickets from their club
CREATE POLICY "Hall users can view their club tickets" ON tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = tickets.created_by_user_id 
      AND users.club_id = tickets.club_id 
      AND users.role = 'hall'
    )
  );

CREATE POLICY "Hall users can create tickets for their club" ON tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = tickets.created_by_user_id 
      AND users.club_id = tickets.club_id 
      AND users.role = 'hall'
    )
  );

CREATE POLICY "Hall users can update their club tickets" ON tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = tickets.created_by_user_id 
      AND users.club_id = tickets.club_id 
      AND users.role = 'hall'
    )
  );

-- Technicians can only see and update tickets assigned to them
CREATE POLICY "Technicians can view their assigned tickets" ON tickets
  FOR SELECT USING (
    tickets.assigned_technician_id = auth.uid()::INTEGER
  );

CREATE POLICY "Technicians can update their assigned tickets" ON tickets
  FOR UPDATE USING (
    tickets.assigned_technician_id = auth.uid()::INTEGER
  );

-- Admins have full access to all tickets
CREATE POLICY "Admins have full access to tickets" ON tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Request status history policies
CREATE POLICY "Users can view status history for accessible tickets" ON request_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN users u ON u.id = t.created_by_user_id
      WHERE t.id = request_status_history.request_id
      AND (
        -- Hall users can see history of their club tickets
        (u.role = 'hall' AND u.club_id = t.club_id) OR
        -- Technicians can see history of assigned tickets
        (t.assigned_technician_id = auth.uid()) OR
        -- Admins can see all
        (u.role = 'admin')
      )
    )
  );

CREATE POLICY "Only system can insert status history" ON request_status_history
  FOR INSERT WITH CHECK (false);

-- Users can view their own profile, admins can view all
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Clubs are readable by all authenticated users
CREATE POLICY "Authenticated users can view clubs" ON clubs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Machines are readable by users from the same club
CREATE POLICY "Users can view machines in their club" ON machines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.club_id = machines.club_id
    )
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );;