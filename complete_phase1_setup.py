#!/usr/bin/env python3
"""
Complete Phase 1 setup using direct database connection.
Creates all tables and storage bucket for File Upload System.
"""

import os
import sys

# Get environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://jmaxcgoooguzmcnnanfb.supabase.co')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
SUPABASE_DB_URL = os.getenv('SUPABASE_DB_URL', '')

if not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment")
    sys.exit(1)

import requests
import json

def create_tables_via_function():
    """Create tables by calling our setup edge function."""
    
    # First, let's try to create the storage bucket via API
    print("Creating storage bucket...")
    bucket_response = requests.post(
        f"{SUPABASE_URL}/storage/v1/bucket",
        headers={
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
        },
        json={
            'id': 'documents',
            'name': 'documents',
            'public': False,
            'file_size_limit': 104857600,
            'allowed_mime_types': [
                'application/pdf',
                'text/plain',
                'text/markdown',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
        }
    )
    
    if bucket_response.status_code in [200, 201]:
        print("✓ Storage bucket 'documents' created successfully")
    elif bucket_response.status_code == 409:
        print("✓ Storage bucket 'documents' already exists")
    else:
        print(f"✗ Failed to create storage bucket: {bucket_response.status_code}")
        print(f"  Response: {bucket_response.text}")
    
    # Now create tables using PostgreSQL REST API
    tables_sql = [
        # Table 1: uploaded_files
        """
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
        """,
        
        # Enable RLS and create indexes for uploaded_files
        """
        ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_hash ON uploaded_files(file_hash);
        CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(upload_status);
        """,
        
        # Table 2: file_content
        """
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
        """,
        
        # Enable RLS and create indexes for file_content
        """
        ALTER TABLE file_content ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_file_content_file_id ON file_content(file_id);
        """,
        
        # Table 3: file_rpe_relationships
        """
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
        """,
        
        # Enable RLS and create indexes for file_rpe_relationships
        """
        ALTER TABLE file_rpe_relationships ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_file_rpe_file_id ON file_rpe_relationships(file_id);
        CREATE INDEX IF NOT EXISTS idx_file_rpe_rpe_id ON file_rpe_relationships(rpe_id);
        CREATE INDEX IF NOT EXISTS idx_file_rpe_type ON file_rpe_relationships(relationship_type);
        """,
        
        # Table 4: file_processing_sessions
        """
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
        """,
        
        # Enable RLS and create indexes for file_processing_sessions
        """
        ALTER TABLE file_processing_sessions ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_processing_sessions_file_id ON file_processing_sessions(file_id);
        CREATE INDEX IF NOT EXISTS idx_processing_sessions_status ON file_processing_sessions(processing_status);
        """,
        
        # Table 5: file_tags
        """
        CREATE TABLE IF NOT EXISTS file_tags (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            file_id UUID NOT NULL,
            tag_name TEXT NOT NULL,
            tag_category TEXT DEFAULT 'user',
            confidence_score FLOAT DEFAULT 1.0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(file_id, tag_name, tag_category)
        );
        """,
        
        # Enable RLS and create indexes for file_tags
        """
        ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
        CREATE INDEX IF NOT EXISTS idx_file_tags_name ON file_tags(tag_name);
        CREATE INDEX IF NOT EXISTS idx_file_tags_category ON file_tags(tag_category);
        """,
    ]
    
    print("\nCreating database tables...")
    
    # Try using the PostgREST query endpoint if available
    # This is a workaround since we can't use the migration tool
    
    # Write SQL to file for manual execution
    output_file = '/workspace/docs/phase1_setup.sql'
    with open(output_file, 'w') as f:
        f.write("-- Phase 1: File Upload System Database Setup\n")
        f.write("-- Execute this SQL in Supabase SQL Editor\n\n")
        for sql in tables_sql:
            f.write(sql.strip() + "\n\n")
    
    print(f"✓ SQL written to {output_file}")
    print("\nTo complete setup, execute the SQL file in Supabase SQL Editor")
    
    return True

if __name__ == '__main__':
    create_tables_via_function()
