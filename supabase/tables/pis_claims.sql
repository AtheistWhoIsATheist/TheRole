CREATE TABLE pis_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement TEXT NOT NULL,
    truth_conditions TEXT,
    domain VARCHAR(100),
    source_concepts UUID[] DEFAULT ARRAY[]::UUID[],
    formal_representation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);