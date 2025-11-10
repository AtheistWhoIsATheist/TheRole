CREATE TABLE transcendence_trajectories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rpe_id UUID,
    stages JSONB NOT NULL,
    current_stage TEXT NOT NULL,
    markers JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);