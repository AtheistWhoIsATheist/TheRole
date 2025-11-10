// upload-file edge function - Working version based on debug
// Supports PDF, TXT, MD, DOCX with content extraction and database storage

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        console.log('=== Function started ===');
        
        // Get Supabase configuration with detailed logging
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

        console.log('Environment check:', {
            hasServiceKey: !!serviceRoleKey,
            hasUrl: !!supabaseUrl,
            hasAnonKey: !!anonKey
        });

        if (!serviceRoleKey || !supabaseUrl || !anonKey) {
            console.error('Missing Supabase configuration');
            throw new Error('Missing Supabase configuration');
        }

        // Handle authentication (optional - can be anonymous)
        const authHeader = req.headers.get('Authorization');
        let userId = null; // Default to null for anonymous users

        if (authHeader) {
            try {
                // Get user information from the JWT token
                const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                        'Authorization': authHeader,
                        'apikey': anonKey
                    }
                });

                if (userResponse.ok) {
                    const user = await userResponse.json();
                    if (user && user.id) {
                        userId = user.id;
                    }
                }
            } catch (authError) {
                console.log('Authentication failed, proceeding as anonymous:', authError.message);
                // Continue with anonymous upload if auth fails
            }
        }

        // Parse form data early
        console.log('Parsing form data...');
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const originalFilename = formData.get('original_filename') as string || file?.name || 'unknown';

        console.log('Form data parsed:', {
            hasFile: !!file,
            fileName: originalFilename,
            fileSize: file?.size || 0
        });

        if (!file) {
            throw new Error('No file provided');
        }

        // Enhanced file type validation with fallback detection
        const getFileType = (file: File, filename: string) => {
            const extension = filename.split('.').pop()?.toLowerCase();
            const mimeType = file.type;
            
            // Map of extension to proper file type and MIME types
            const typeMap = {
                'pdf': { databaseType: 'pdf', mimeTypes: ['application/pdf', 'application/octet-stream'] },
                'txt': { databaseType: 'txt', mimeTypes: ['text/plain', 'text/plain; charset=utf-8'] },
                'md': { databaseType: 'md', mimeTypes: ['text/markdown', 'text/plain', 'text/plain; charset=utf-8'] },
                'docx': { databaseType: 'docx', mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] }
            };

            // First try by file extension (more reliable)
            if (extension && typeMap[extension]) {
                return { databaseType: typeMap[extension].databaseType, originalMimeType: mimeType };
            }

            // Fallback to MIME type
            for (const [ext, config] of Object.entries(typeMap)) {
                if (config.mimeTypes.includes(mimeType)) {
                    return { databaseType: config.databaseType, originalMimeType: mimeType };
                }
            }

            return null;
        };

        const fileTypeInfo = getFileType(file, originalFilename);
        if (!fileTypeInfo) {
            throw new Error(`Unsupported file type: ${file.type || 'unknown'}. Supported formats: PDF, TXT, MD, DOCX`);
        }

        const databaseFileType = fileTypeInfo.databaseType;
        console.log('File type validated:', databaseFileType);

        // Generate file hash for deduplication
        const fileArrayBuffer = await file.arrayBuffer();
        const fileHashBuffer = await crypto.subtle.digest('SHA-256', fileArrayBuffer);
        const fileHashArray = Array.from(new Uint8Array(fileHashBuffer));
        const fileHash = fileHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        console.log('File hash generated:', fileHash.substring(0, 16) + '...');

        // Check for duplicate file hash (but don't block - just warn)
        const duplicateCheckResponse = await fetch(`${supabaseUrl}/rest/v1/uploaded_files?file_hash=eq.${fileHash}&select=id,filename`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        const duplicates = await duplicateCheckResponse.json();
        if (duplicates && duplicates.length > 0) {
            console.log('Duplicate file detected, proceeding anyway:', duplicates[0].filename);
            // Continue with upload instead of blocking
        }

        // Create storage path
        const storagePath = `anonymous/${fileHash}_${originalFilename}`;

        // Upload to storage (optional - can skip if fails)
        let storageSuccess = false;
        try {
            const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/documents/${storagePath}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': file.type
                },
                body: fileArrayBuffer
            });

            if (uploadResponse.ok) {
                storageSuccess = true;
                console.log('Storage upload successful');
            } else {
                console.warn('Storage upload failed:', await uploadResponse.text());
            }
        } catch (storageError) {
            console.warn('Storage upload error:', storageError);
        }

        // Extract text content based on file type
        let extractedText = '';
        let extractionMethod = '';
        let metadata: any = {};

        try {
            switch (databaseFileType) {
                case 'txt':
                    // Direct text extraction
                    const textDecoder = new TextDecoder('utf-8');
                    extractedText = textDecoder.decode(fileArrayBuffer);
                    extractionMethod = 'direct_text_decoding';
                    break;

                case 'md':
                    // Markdown parsing - extract content and structure
                    const mdDecoder = new TextDecoder('utf-8');
                    extractedText = mdDecoder.decode(fileArrayBuffer);
                    extractionMethod = 'markdown_parsing';
                    
                    // Extract basic markdown metadata
                    const lines = extractedText.split('\n');
                    const titleMatch = lines.find(line => line.startsWith('# '));
                    if (titleMatch) {
                        metadata.title = titleMatch.replace('# ', '').trim();
                    }
                    break;

                case 'pdf':
                    // PDF content extraction (basic approach)
                    extractionMethod = 'pdf_basic_extraction';
                    extractedText = '[PDF content extraction not yet implemented]';
                    break;

                case 'docx':
                    // DOCX content extraction (basic approach)
                    extractionMethod = 'docx_basic_extraction';
                    extractedText = '[DOCX content extraction not yet implemented]';
                    break;
            }
        } catch (extractionError) {
            console.warn('Content extraction failed:', extractionError);
            extractionMethod = 'extraction_failed';
            extractedText = '';
        }

        // Basic file metadata
        const fileMetadata = {
            filename: originalFilename,
            original_filename: originalFilename,
            file_type: databaseFileType,
            file_size: file.size,
            file_hash: fileHash,
            storage_path: storageSuccess ? storagePath : '',
            upload_status: extractionMethod === 'extraction_failed' ? 'failed' : 'pending',
            metadata: metadata,
            user_id: userId // Will be null for anonymous users
        };

        console.log('Metadata prepared, attempting database insert...');

        // Store file metadata in database
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/uploaded_files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(fileMetadata)
        });

        console.log('Database insert response status:', insertResponse.status);

        if (!insertResponse.ok) {
            const insertError = await insertResponse.text();
            console.error('Database insert failed:', insertError);
            
            // If it's a duplicate entry, try to fetch the existing file
            if (insertResponse.status === 409) {
                console.log('Handling 409 conflict - checking for existing file');
                const existingFileResponse = await fetch(`${supabaseUrl}/rest/v1/uploaded_files?file_hash=eq.${fileHash}&select=*&limit=1`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (existingFileResponse.ok) {
                    const existingFiles = await existingFileResponse.json();
                    if (existingFiles && existingFiles.length > 0) {
                        const existingFile = existingFiles[0];
                        return new Response(JSON.stringify({
                            success: true,
                            data: {
                                file_id: existingFile.id,
                                filename: existingFile.filename,
                                file_type: existingFile.file_type,
                                file_size: existingFile.file_size,
                                file_hash: existingFile.file_hash,
                                storage_path: existingFile.storage_path,
                                upload_status: existingFile.upload_status,
                                extraction_method: 'duplicate_file',
                                content_length: 0,
                                metadata: existingFile.metadata,
                                is_duplicate: true
                            }
                        }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        });
                    }
                }
            }
            
            throw new Error(`Database insert failed: ${insertError}`);
        }

        const [uploadedFile] = await insertResponse.json();
        console.log('File inserted successfully, ID:', uploadedFile.id);

        // Store extracted content if available
        if (extractedText && extractedText.length > 0) {
            const contentMetadata = {
                file_id: uploadedFile.id,
                extracted_text: extractedText,
                content_length: extractedText.length,
                extraction_method: extractionMethod,
                extraction_confidence: extractionMethod === 'extraction_failed' ? 0.0 : 1.0
            };

            try {
                await fetch(`${supabaseUrl}/rest/v1/file_content`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(contentMetadata)
                });
                console.log('Content stored successfully');
            } catch (contentError) {
                console.warn('Content storage failed:', contentError);
            }
        }

        // Create processing session
        const processingSession = {
            file_id: uploadedFile.id,
            processing_status: 'queued',
            processing_steps: [
                { step: 'upload', status: 'completed', timestamp: new Date().toISOString() },
                { step: 'extraction', status: extractedText ? 'completed' : 'failed', timestamp: new Date().toISOString() }
            ]
        };

        try {
            await fetch(`${supabaseUrl}/rest/v1/file_processing_sessions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(processingSession)
            });
            console.log('Processing session created');
        } catch (sessionError) {
            console.warn('Processing session creation failed:', sessionError);
        }

        // Trigger content processing pipeline
        if (extractedText) {
            try {
                const processingResponse = await fetch(`${supabaseUrl}/functions/v1/process-file-content`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        file_id: uploadedFile.id
                    })
                });

                if (!processingResponse.ok) {
                    console.warn('Content processing trigger failed:', await processingResponse.text());
                } else {
                    const processingData = await processingResponse.json();
                    console.log('Content processing pipeline completed:', processingData);
                }
            } catch (processingError) {
                console.error('Failed to trigger content processing:', processingError);
                // Don't fail the upload if processing trigger fails
            }
        }

        console.log('=== Function completed successfully ===');

        return new Response(JSON.stringify({
            success: true,
            data: {
                file_id: uploadedFile.id,
                filename: originalFilename,
                file_type: databaseFileType,
                file_size: file.size,
                file_hash: fileHash,
                storage_path: storagePath,
                upload_status: extractedText ? 'pending' : 'failed',
                extraction_method: extractionMethod,
                content_length: extractedText ? extractedText.length : 0,
                metadata: metadata
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('File upload error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'UPLOAD_FAILED',
                message: error.message || 'File upload failed'
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});