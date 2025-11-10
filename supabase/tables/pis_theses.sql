CREATE TABLE pis_theses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement TEXT NOT NULL,
    domain VARCHAR(100),
    support_strength DECIMAL(3,2) DEFAULT 0.5,
    status VARCHAR(50) DEFAULT 'unverified',
    related_rpe_id UUID,
    related_axiom_id UUID,
    gate_g1 BOOLEAN DEFAULT FALSE,
    gate_g2 BOOLEAN DEFAULT FALSE,
    gate_g3 BOOLEAN DEFAULT FALSE,
    gate_g4 BOOLEAN DEFAULT FALSE,
    gate_g5 BOOLEAN DEFAULT FALSE,
    gate_g6 BOOLEAN DEFAULT FALSE,
    validation_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);