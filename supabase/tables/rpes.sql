CREATE TABLE rpes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    recursion_depth INTEGER NOT NULL,
    self_modification_capacity TEXT NOT NULL,
    dissolution_trigger TEXT NOT NULL,
    regeneration_seed TEXT NOT NULL,
    theistic_placeholder_function TEXT NOT NULL,
    nihilistic_core TEXT NOT NULL,
    paradox_engine TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);