CREATE TABLE pis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_type VARCHAR(100) NOT NULL,
    input_parameters JSONB DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    hash_signature VARCHAR(64)
);