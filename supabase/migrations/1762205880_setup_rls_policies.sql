-- Migration: setup_rls_policies
-- Created at: 1762205880


-- Enable RLS on all tables
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role from JWT
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM users WHERE id = auth.uid()::int),
    ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user club_id
CREATE OR REPLACE FUNCTION get_user_club_id()
RETURNS INT AS $$
BEGIN
  RETURN (SELECT club_id FROM users WHERE id = auth.uid()::int);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CLUBS policies
CREATE POLICY "Clubs: Everyone can view" ON clubs FOR SELECT USING (true);
CREATE POLICY "Clubs: Admins can insert" ON clubs FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Clubs: Admins can update" ON clubs FOR UPDATE USING (get_user_role() = 'admin');

-- USERS policies
CREATE POLICY "Users: Users can view own profile" ON users FOR SELECT USING (id = auth.uid()::int OR get_user_role() = 'admin');
CREATE POLICY "Users: Allow insert via edge function" ON users FOR INSERT WITH CHECK (auth.role() IN ('anon', 'service_role'));
CREATE POLICY "Users: Users can update own profile" ON users FOR UPDATE USING (id = auth.uid()::int);
CREATE POLICY "Users: Admins can update all" ON users FOR UPDATE USING (get_user_role() = 'admin');

-- MACHINES policies
CREATE POLICY "Machines: Everyone can view" ON machines FOR SELECT USING (true);
CREATE POLICY "Machines: Admins can insert" ON machines FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Machines: Admins can update" ON machines FOR UPDATE USING (get_user_role() = 'admin');

-- TICKETS policies
CREATE POLICY "Tickets: Club users view own club tickets" ON tickets FOR SELECT 
  USING (
    get_user_role() = 'admin' OR
    (get_user_role() = 'club' AND club_id = get_user_club_id()) OR
    (get_user_role() = 'technician' AND assigned_technician_id = auth.uid()::int)
  );

CREATE POLICY "Tickets: Club users can create tickets" ON tickets FOR INSERT 
  WITH CHECK (
    (get_user_role() = 'club' AND club_id = get_user_club_id()) OR
    get_user_role() = 'admin' OR
    auth.role() IN ('anon', 'service_role')
  );

CREATE POLICY "Tickets: Technicians update assigned tickets" ON tickets FOR UPDATE 
  USING (
    get_user_role() = 'admin' OR
    (get_user_role() = 'technician' AND assigned_technician_id = auth.uid()::int) OR
    (get_user_role() = 'club' AND club_id = get_user_club_id()) OR
    auth.role() = 'service_role'
  );

-- TICKET_ATTACHMENTS policies
CREATE POLICY "Attachments: View based on ticket access" ON ticket_attachments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM tickets t 
      WHERE t.id = ticket_attachments.ticket_id 
      AND (
        get_user_role() = 'admin' OR
        (get_user_role() = 'club' AND t.club_id = get_user_club_id()) OR
        (get_user_role() = 'technician' AND t.assigned_technician_id = auth.uid()::int)
      )
    )
  );

CREATE POLICY "Attachments: Allow insert" ON ticket_attachments FOR INSERT 
  WITH CHECK (auth.role() IN ('anon', 'service_role'));
;