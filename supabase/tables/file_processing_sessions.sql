CREATE TABLE file_processing_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL,
    processing_status TEXT DEFAULT 'queued' CHECK (processing_status IN ('queued',
    'processing',
    'completed',
    'failed',
    'cancelled')),
    processing_steps JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);