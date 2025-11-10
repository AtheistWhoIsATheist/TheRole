CREATE TABLE axioms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    number INTEGER UNIQUE NOT NULL,
    core_insight TEXT NOT NULL,
    theistic_placeholder TEXT NOT NULL,
    nihilistic_core TEXT NOT NULL,
    transcendence_trajectory TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);