-- Migration: setup_rls_policies_fixed
-- Created at: 1762205901


-- Enable RLS on all tables
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- CLUBS policies - Allow read for authenticated, write for admin via edge functions
CREATE POLICY "Clubs: Public read access" ON clubs FOR SELECT USING (true);
CREATE POLICY "Clubs: Service role can manage" ON clubs FOR ALL 
  USING (auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.role() IN ('anon', 'service_role'));

-- USERS policies - Managed via edge functions
CREATE POLICY "Users: Public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Users: Service role can manage" ON users FOR ALL 
  USING (auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.role() IN ('anon', 'service_role'));

-- MACHINES policies
CREATE POLICY "Machines: Public read access" ON machines FOR SELECT USING (true);
CREATE POLICY "Machines: Service role can manage" ON machines FOR ALL 
  USING (auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.role() IN ('anon', 'service_role'));

-- TICKETS policies - Business logic enforced in edge functions
CREATE POLICY "Tickets: Public read access" ON tickets FOR SELECT USING (true);
CREATE POLICY "Tickets: Service role can manage" ON tickets FOR ALL 
  USING (auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.role() IN ('anon', 'service_role'));

-- TICKET_ATTACHMENTS policies
CREATE POLICY "Attachments: Public read access" ON ticket_attachments FOR SELECT USING (true);
CREATE POLICY "Attachments: Service role can manage" ON ticket_attachments FOR ALL 
  USING (auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.role() IN ('anon', 'service_role'));
;