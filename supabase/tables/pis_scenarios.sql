CREATE TABLE pis_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    domain VARCHAR(100),
    related_thesis UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);