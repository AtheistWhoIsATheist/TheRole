CREATE TABLE file_rpe_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL,
    rpe_id UUID NOT NULL,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('inspired',
    'supports',
    'contradicts',
    'references',
    'contains')),
    relationship_strength FLOAT DEFAULT 0.5,
    context_text TEXT,
    confidence_score FLOAT DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);