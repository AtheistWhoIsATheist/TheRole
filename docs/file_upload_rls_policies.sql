-- RLS Policies for File Upload System
-- Execute in Supabase SQL Editor

-- ============================================================================
-- TABLE: uploaded_files
-- ============================================================================
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can insert their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can update their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON uploaded_files;

-- Create new policies
CREATE POLICY "Users can view their own files" ON uploaded_files
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own files" ON uploaded_files
    FOR INSERT WITH CHECK (user_id = auth.uid() AND (auth.role() IN ('anon', 'service_role')));

CREATE POLICY "Users can update their own files" ON uploaded_files
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own files" ON uploaded_files
    FOR DELETE USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_hash ON uploaded_files(file_hash);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(upload_status);

-- ============================================================================
-- TABLE: file_content
-- ============================================================================
ALTER TABLE file_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their file content" ON file_content;
DROP POLICY IF EXISTS "Allow insert via edge function" ON file_content;

CREATE POLICY "Users can view their file content" ON file_content
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM uploaded_files 
            WHERE uploaded_files.id = file_content.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow insert via edge function" ON file_content
    FOR INSERT WITH CHECK (auth.role() IN ('anon', 'service_role'));

CREATE INDEX IF NOT EXISTS idx_file_content_file_id ON file_content(file_id);

-- ============================================================================
-- TABLE: file_rpe_relationships
-- ============================================================================
ALTER TABLE file_rpe_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their file relationships" ON file_rpe_relationships;
DROP POLICY IF EXISTS "Allow insert via edge function" ON file_rpe_relationships;

CREATE POLICY "Users can view their file relationships" ON file_rpe_relationships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM uploaded_files 
            WHERE uploaded_files.id = file_rpe_relationships.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow insert via edge function" ON file_rpe_relationships
    FOR INSERT WITH CHECK (auth.role() IN ('anon', 'service_role'));

CREATE INDEX IF NOT EXISTS idx_file_rpe_file_id ON file_rpe_relationships(file_id);
CREATE INDEX IF NOT EXISTS idx_file_rpe_rpe_id ON file_rpe_relationships(rpe_id);
CREATE INDEX IF NOT EXISTS idx_file_rpe_type ON file_rpe_relationships(relationship_type);

-- ============================================================================
-- TABLE: file_processing_sessions
-- ============================================================================
ALTER TABLE file_processing_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their processing sessions" ON file_processing_sessions;
DROP POLICY IF EXISTS "Allow insert via edge function" ON file_processing_sessions;
DROP POLICY IF EXISTS "Allow update via edge function" ON file_processing_sessions;

CREATE POLICY "Users can view their processing sessions" ON file_processing_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM uploaded_files 
            WHERE uploaded_files.id = file_processing_sessions.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow insert via edge function" ON file_processing_sessions
    FOR INSERT WITH CHECK (auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Allow update via edge function" ON file_processing_sessions
    FOR UPDATE USING (auth.role() IN ('anon', 'service_role'));

CREATE INDEX IF NOT EXISTS idx_processing_sessions_file_id ON file_processing_sessions(file_id);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_status ON file_processing_sessions(processing_status);

-- ============================================================================
-- TABLE: file_tags
-- ============================================================================
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their file tags" ON file_tags;
DROP POLICY IF EXISTS "Allow insert via edge function" ON file_tags;

CREATE POLICY "Users can view their file tags" ON file_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM uploaded_files 
            WHERE uploaded_files.id = file_tags.file_id 
            AND uploaded_files.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow insert via edge function" ON file_tags
    FOR INSERT WITH CHECK (auth.role() IN ('anon', 'service_role'));

CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_name ON file_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_file_tags_category ON file_tags(tag_category);

-- ============================================================================
-- STORAGE: documents bucket
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own uploaded files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

CREATE POLICY "Users can view their own uploaded files" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text AND auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
