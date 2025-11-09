-- Migration: create_custom_rls_policies
-- Created at: 1762692139

-- Create RLS policies for tickets table that work with custom authentication
-- Note: These will be used with x-user-token header in edge functions

-- Allow authenticated users to read tickets based on their role and club
CREATE POLICY "Users can view tickets based on role and club" ON tickets
  FOR SELECT USING (
    -- Admin can see all tickets
    EXISTS (SELECT 1 FROM users WHERE users.id = tickets.created_by_user_id AND users.role = 'admin') OR
    -- Hall users can see tickets from their club
    (EXISTS (SELECT 1 FROM users u WHERE u.id = tickets.created_by_user_id AND u.role = 'hall' AND u.club_id = tickets.club_id)) OR
    -- Technicians can see tickets assigned to them
    (tickets.assigned_technician_id = (SELECT id FROM users WHERE role = 'technician' LIMIT 1))
  );

-- Allow hall users to create tickets for their club
CREATE POLICY "Hall users can create tickets" ON tickets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = tickets.created_by_user_id AND users.role = 'hall' AND users.club_id = tickets.club_id)
  );

-- Allow hall users to update their club tickets
CREATE POLICY "Hall users can update their tickets" ON tickets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = tickets.created_by_user_id AND users.role = 'hall' AND users.club_id = tickets.club_id)
  );

-- Allow technicians to update their assigned tickets
CREATE POLICY "Technicians can update assigned tickets" ON tickets
  FOR UPDATE USING (
    tickets.assigned_technician_id = (SELECT id FROM users WHERE role = 'technician' AND id = current_setting('app.current_user_id')::INTEGER)
  );

-- Allow admins full access
CREATE POLICY "Admins have full access" ON tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1) AND users.role = 'admin')
  );

-- Request status history policies
CREATE POLICY "Users can view status history" ON request_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN users u ON u.id = t.created_by_user_id
      WHERE t.id = request_status_history.request_id
      AND (
        u.role = 'admin' OR
        (u.role = 'hall' AND u.club_id = t.club_id) OR
        (t.assigned_technician_id = (SELECT id FROM users WHERE role = 'technician' AND id = current_setting('app.current_user_id')::INTEGER))
      )
    )
  );

-- Other table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can view clubs" ON clubs
  FOR SELECT USING (true);

CREATE POLICY "Users can view machines in accessible clubs" ON machines
  FOR SELECT USING (true);;