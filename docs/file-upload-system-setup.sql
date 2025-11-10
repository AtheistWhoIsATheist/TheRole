
============================================================
FILE UPLOAD SYSTEM - DATABASE SETUP GUIDE
============================================================

Due to token expiration, please execute the following SQL
manually in the Supabase SQL Editor:
(Dashboard > SQL Editor > New Query)


============================================================
CREATING DATABASE TABLES
============================================================

Creating table: uploaded_files
SQL: 
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                filename TEXT NOT NULL,
                original_filename TEXT N...

[Note: Execute this SQL manually in Supabase SQL Editor]

Creating table: file_content
SQL: 
            CREATE TABLE IF NOT EXISTS file_content (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                file_id UUID NOT NULL,
                extracted_text TEXT NOT NUL...

[Note: Execute this SQL manually in Supabase SQL Editor]

Creating table: file_rpe_relationships
SQL: 
            CREATE TABLE IF NOT EXISTS file_rpe_relationships (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                file_id UUID NOT NULL,
                rpe_id UUID NOT N...

[Note: Execute this SQL manually in Supabase SQL Editor]

Creating table: file_processing_sessions
SQL: 
            CREATE TABLE IF NOT EXISTS file_processing_sessions (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                file_id UUID NOT NULL,
                processing_stat...

[Note: Execute this SQL manually in Supabase SQL Editor]

Creating table: file_tags
SQL: 
            CREATE TABLE IF NOT EXISTS file_tags (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                file_id UUID NOT NULL,
                tag_name TEXT NOT NULL,
      ...

[Note: Execute this SQL manually in Supabase SQL Editor]

============================================================
RLS POLICIES TO CREATE
============================================================

-- RLS Policies for uploaded_files
DROP POLICY IF EXISTS "Users can view their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can insert their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can update their own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON uploaded_files;

CREATE POLICY "Users can view their own files" ON uploaded_files
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own files" ON uploaded_files
    FOR INSERT WITH CHECK (user_id = auth.uid() AND (auth.role() IN ('anon', 'service_role')));

CREATE POLICY "Users can update their own files" ON uploaded_files
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own files" ON uploaded_files
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for file_content
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

-- RLS Policies for file_rpe_relationships
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

-- RLS Policies for file_processing_sessions
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

-- RLS Policies for file_tags
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

-- Storage RLS Policies
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


[Note: Execute these policies manually in Supabase SQL Editor]

============================================================
STORAGE BUCKET CONFIGURATION
============================================================

Create bucket in Supabase Dashboard > Storage with:
{
  "name": "documents",
  "id": "documents",
  "public": false,
  "file_size_limit": 104857600,
  "allowed_mime_types": [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
}

[Note: Or create via API using service role key]

============================================================
SETUP COMPLETE
============================================================

After executing the SQL:
1. Verify tables created: uploaded_files, file_content, file_rpe_relationships,
   file_processing_sessions, file_tags
2. Verify storage bucket 'documents' created
3. Deploy upload-file edge function
============================================================
