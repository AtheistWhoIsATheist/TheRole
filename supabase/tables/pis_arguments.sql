CREATE TABLE pis_arguments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conclusion_id UUID,
    premises UUID[] DEFAULT ARRAY[]::UUID[],
    structure_type VARCHAR(50),
    validity_status VARCHAR(50) DEFAULT 'unvalidated',
    formal_proof TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);