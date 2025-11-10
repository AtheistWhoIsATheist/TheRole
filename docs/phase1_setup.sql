-- Phase 1: File Upload System Database Setup
-- Execute this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS uploaded_files (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            filename TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'txt', 'md', 'docx')),
            file_size BIGINT NOT NULL,
            file_hash TEXT UNIQUE NOT NULL,
            storage_path TEXT NOT NULL,
            upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processed', 'failed')),
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE,
            metadata JSONB DEFAULT '{}',
            user_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_hash ON uploaded_files(file_hash);
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(upload_status);

CREATE TABLE IF NOT EXISTS file_content (
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

ALTER TABLE file_content ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_file_content_file_id ON file_content(file_id);

CREATE TABLE IF NOT EXISTS file_rpe_relationships (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            file_id UUID NOT NULL,
            rpe_id UUID NOT NULL,
            relationship_type TEXT NOT NULL CHECK (relationship_type IN ('inspired', 'supports', 'contradicts', 'references', 'contains')),
            relationship_strength FLOAT DEFAULT 0.5,
            context_text TEXT,
            confidence_score FLOAT DEFAULT 0.5,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

ALTER TABLE file_rpe_relationships ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_file_rpe_file_id ON file_rpe_relationships(file_id);
        CREATE INDEX IF NOT EXISTS idx_file_rpe_rpe_id ON file_rpe_relationships(rpe_id);
        CREATE INDEX IF NOT EXISTS idx_file_rpe_type ON file_rpe_relationships(relationship_type);

CREATE TABLE IF NOT EXISTS file_processing_sessions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            file_id UUID NOT NULL,
            processing_status TEXT DEFAULT 'queued' CHECK (processing_status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
            processing_steps JSONB DEFAULT '[]',
            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE,
            error_message TEXT,
            processing_time_ms INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

ALTER TABLE file_processing_sessions ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_processing_sessions_file_id ON file_processing_sessions(file_id);
        CREATE INDEX IF NOT EXISTS idx_processing_sessions_status ON file_processing_sessions(processing_status);

CREATE TABLE IF NOT EXISTS file_tags (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            file_id UUID NOT NULL,
            tag_name TEXT NOT NULL,
            tag_category TEXT DEFAULT 'user',
            confidence_score FLOAT DEFAULT 1.0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(file_id, tag_name, tag_category)
        );

ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
        CREATE INDEX IF NOT EXISTS idx_file_tags_name ON file_tags(tag_name);
        CREATE INDEX IF NOT EXISTS idx_file_tags_category ON file_tags(tag_category);

