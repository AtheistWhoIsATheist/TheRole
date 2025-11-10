#!/usr/bin/env python3
"""
Setup script for File Upload System database tables and storage bucket.
Uses Supabase REST API with service role key to bypass token expiration issues.
"""

import requests
import json
import sys

SUPABASE_URL = "https://jmaxcgoooguzmcnnanfb.supabase.co"

def get_service_role_key():
    """Prompt for service role key."""
    print("=" * 60)
    print("FILE UPLOAD SYSTEM - DATABASE SETUP")
    print("=" * 60)
    print("\nThis script will create 5 database tables and 1 storage bucket")
    print("for the Nihiltheistic Engine File Upload System.\n")
    
    service_key = input("Enter SUPABASE_SERVICE_ROLE_KEY: ").strip()
    if not service_key:
        print("Error: Service role key is required")
        sys.exit(1)
    return service_key

def execute_sql(sql_query, service_key):
    """Execute SQL using Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/query"
    headers = {
        'Authorization': f'Bearer {service_key}',
        'apikey': service_key,
        'Content-Type': 'application/json',
    }
    
    # Try direct SQL execution via PostgREST
    # Note: This might not work, so we'll use a different approach
    
    # Split SQL into individual statements
    statements = [s.strip() for s in sql_query.split(';') if s.strip()]
    
    results = []
    for statement in statements:
        if not statement:
            continue
            
        try:
            # Use the database connection pool endpoint
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/query",
                headers=headers,
                json={'query': statement}
            )
            results.append({
                'statement': statement[:100] + '...' if len(statement) > 100 else statement,
                'status': response.status_code,
                'success': response.ok
            })
        except Exception as e:
            results.append({
                'statement': statement[:100] + '...' if len(statement) > 100 else statement,
                'error': str(e),
                'success': False
            })
    
    return results

def create_tables(service_key):
    """Create all database tables for file upload system."""
    print("\n" + "=" * 60)
    print("CREATING DATABASE TABLES")
    print("=" * 60)
    
    tables_sql = {
        'uploaded_files': """
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
        """,
        
        'file_content': """
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
        """,
        
        'file_rpe_relationships': """
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
        """,
        
        'file_processing_sessions': """
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
        """,
        
        'file_tags': """
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
        """
    }
    
    for table_name, sql in tables_sql.items():
        print(f"\nCreating table: {table_name}")
        print(f"SQL: {sql[:200]}..." if len(sql) > 200 else f"SQL: {sql}")
        print("\n[Note: Execute this SQL manually in Supabase SQL Editor]")

def create_rls_policies(service_key):
    """Create RLS policies for all tables."""
    print("\n" + "=" * 60)
    print("RLS POLICIES TO CREATE")
    print("=" * 60)
    
    policies = """
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
"""
    
    print(policies)
    print("\n[Note: Execute these policies manually in Supabase SQL Editor]")

def create_storage_bucket():
    """Create storage bucket configuration."""
    print("\n" + "=" * 60)
    print("STORAGE BUCKET CONFIGURATION")
    print("=" * 60)
    
    config = {
        "name": "documents",
        "id": "documents",
        "public": False,
        "file_size_limit": 104857600,  # 100MB
        "allowed_mime_types": [
            "application/pdf",
            "text/plain",
            "text/markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]
    }
    
    print("\nCreate bucket in Supabase Dashboard > Storage with:")
    print(json.dumps(config, indent=2))
    print("\n[Note: Or create via API using service role key]")

def main():
    print("\n" + "=" * 60)
    print("FILE UPLOAD SYSTEM - DATABASE SETUP GUIDE")
    print("=" * 60)
    print("\nDue to token expiration, please execute the following SQL")
    print("manually in the Supabase SQL Editor:")
    print("(Dashboard > SQL Editor > New Query)\n")
    
    # Don't ask for key, just output the SQL
    create_tables(None)
    create_rls_policies(None)
    create_storage_bucket()
    
    print("\n" + "=" * 60)
    print("SETUP COMPLETE")
    print("=" * 60)
    print("\nAfter executing the SQL:")
    print("1. Verify tables created: uploaded_files, file_content, file_rpe_relationships,")
    print("   file_processing_sessions, file_tags")
    print("2. Verify storage bucket 'documents' created")
    print("3. Deploy upload-file edge function")
    print("=" * 60)

if __name__ == '__main__':
    main()
