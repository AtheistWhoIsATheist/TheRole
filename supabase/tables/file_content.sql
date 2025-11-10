CREATE TABLE file_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL,
    extracted_text TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    language_code TEXT DEFAULT 'en',
    encoding TEXT DEFAULT 'utf-8',
    extraction_method TEXT,
    extraction_confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);