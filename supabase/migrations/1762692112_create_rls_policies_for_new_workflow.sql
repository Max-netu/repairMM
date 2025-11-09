-- Migration: create_rls_policies_for_new_workflow
-- Created at: 1762692112

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
  );;