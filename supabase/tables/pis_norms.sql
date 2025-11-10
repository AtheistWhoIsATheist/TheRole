CREATE TABLE pis_norms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    principle TEXT NOT NULL,
    scope VARCHAR(100),
    domain VARCHAR(100),
    justification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);