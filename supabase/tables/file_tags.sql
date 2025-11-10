CREATE TABLE file_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL,
    tag_name TEXT NOT NULL,
    tag_category TEXT DEFAULT 'user',
    confidence_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(file_id,
    tag_name,
    tag_category)
);