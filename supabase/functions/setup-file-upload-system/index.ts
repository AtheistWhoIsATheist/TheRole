Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Missing Supabase configuration');
        }

        const results = {
            tables_created: [],
            storage_bucket_created: false,
            rls_policies_created: [],
            errors: []
        };

        // Create Table 1: uploaded_files
        try {
            const createUploadedFilesTable = `
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
            `;

            const res1 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: createUploadedFilesTable })
            });

            if (res1.ok) {
                results.tables_created.push('uploaded_files');
            }
        } catch (error) {
            results.errors.push(`uploaded_files: ${error.message}`);
        }

        // Create RLS policies for uploaded_files
        try {
            const rlsPolicies = `
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
            `;

            const res2 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: rlsPolicies })
            });

            if (res2.ok) {
                results.rls_policies_created.push('uploaded_files_policies');
            }
        } catch (error) {
            results.errors.push(`uploaded_files_policies: ${error.message}`);
        }

        // Create Table 2: file_content
        try {
            const createFileContentTable = `
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
            `;

            const res3 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: createFileContentTable })
            });

            if (res3.ok) {
                results.tables_created.push('file_content');
            }
        } catch (error) {
            results.errors.push(`file_content: ${error.message}`);
        }

        // Create RLS policies for file_content
        try {
            const rlsFileContent = `
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
            `;

            const res4 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: rlsFileContent })
            });

            if (res4.ok) {
                results.rls_policies_created.push('file_content_policies');
            }
        } catch (error) {
            results.errors.push(`file_content_policies: ${error.message}`);
        }

        // Create Table 3: file_rpe_relationships
        try {
            const createFileRpeTable = `
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
            `;

            const res5 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: createFileRpeTable })
            });

            if (res5.ok) {
                results.tables_created.push('file_rpe_relationships');
            }
        } catch (error) {
            results.errors.push(`file_rpe_relationships: ${error.message}`);
        }

        // Create RLS policies for file_rpe_relationships
        try {
            const rlsFileRpe = `
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
            `;

            const res6 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: rlsFileRpe })
            });

            if (res6.ok) {
                results.rls_policies_created.push('file_rpe_relationships_policies');
            }
        } catch (error) {
            results.errors.push(`file_rpe_relationships_policies: ${error.message}`);
        }

        // Create Table 4: file_processing_sessions
        try {
            const createProcessingSessionsTable = `
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
            `;

            const res7 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: createProcessingSessionsTable })
            });

            if (res7.ok) {
                results.tables_created.push('file_processing_sessions');
            }
        } catch (error) {
            results.errors.push(`file_processing_sessions: ${error.message}`);
        }

        // Create RLS policies for file_processing_sessions
        try {
            const rlsProcessingSessions = `
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
            `;

            const res8 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: rlsProcessingSessions })
            });

            if (res8.ok) {
                results.rls_policies_created.push('file_processing_sessions_policies');
            }
        } catch (error) {
            results.errors.push(`file_processing_sessions_policies: ${error.message}`);
        }

        // Create Table 5: file_tags
        try {
            const createFileTagsTable = `
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
            `;

            const res9 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: createFileTagsTable })
            });

            if (res9.ok) {
                results.tables_created.push('file_tags');
            }
        } catch (error) {
            results.errors.push(`file_tags: ${error.message}`);
        }

        // Create RLS policies for file_tags
        try {
            const rlsFileTags = `
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
            `;

            const res10 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: rlsFileTags })
            });

            if (res10.ok) {
                results.rls_policies_created.push('file_tags_policies');
            }
        } catch (error) {
            results.errors.push(`file_tags_policies: ${error.message}`);
        }

        // Create storage bucket
        try {
            const createBucket = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: 'documents',
                    name: 'documents',
                    public: false,
                    file_size_limit: 104857600,
                    allowed_mime_types: [
                        'application/pdf',
                        'text/plain',
                        'text/markdown',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ]
                })
            });

            if (createBucket.ok || createBucket.status === 409) {
                results.storage_bucket_created = true;
            }
        } catch (error) {
            results.errors.push(`storage_bucket: ${error.message}`);
        }

        // Create storage RLS policies
        try {
            const storageRls = `
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
            `;

            const res11 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: storageRls })
            });

            if (res11.ok) {
                results.rls_policies_created.push('storage_objects_policies');
            }
        } catch (error) {
            results.errors.push(`storage_rls: ${error.message}`);
        }

        return new Response(JSON.stringify({ data: results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Setup error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'SETUP_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
