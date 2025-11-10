CREATE TABLE pis_hypotheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hypothesis TEXT NOT NULL,
    alternatives UUID[] DEFAULT ARRAY[]::UUID[],
    test_criteria TEXT,
    verification_status VARCHAR(50) DEFAULT 'untested',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);