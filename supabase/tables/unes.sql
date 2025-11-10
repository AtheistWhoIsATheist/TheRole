CREATE TABLE unes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rpe_id UUID,
    name TEXT NOT NULL,
    pre_une TEXT NOT NULL,
    une_rupture TEXT NOT NULL,
    post_une_resonance TEXT NOT NULL,
    transcendent_echo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);