-- Migration: create_documents_bucket_only
-- Created at: 1762773164

-- Create storage bucket for documents (PDF, TXT, MD, DOCX)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents', 
    false, 
    104857600, -- 100MB file size limit
    ARRAY[
        'application/pdf',
        'text/plain', 
        'text/markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;;