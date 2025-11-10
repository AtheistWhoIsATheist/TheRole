-- Migration: configure_rls_policies
-- Created at: 1762658171


-- Enable RLS on all tables
ALTER TABLE axioms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpes ENABLE ROW LEVEL SECURITY;
ALTER TABLE unes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcendence_trajectories ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to axioms
CREATE POLICY "Allow public read access to axioms" ON axioms
    FOR SELECT USING (true);

-- Allow edge functions to insert/update rpes
CREATE POLICY "Allow edge function access to rpes" ON rpes
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

-- Allow edge functions to insert/update unes
CREATE POLICY "Allow edge function access to unes" ON unes
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

-- Allow edge functions to insert/update transcendence_trajectories
CREATE POLICY "Allow edge function access to trajectories" ON transcendence_trajectories
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

-- Allow edge functions to insert/update processing_sessions
CREATE POLICY "Allow edge function access to sessions" ON processing_sessions
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));
;