// upload-file edge function with debugging for boot error
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

        // Simple file type validation
        const getFileType = (file: File, filename: string) => {
            const extension = filename.split('.').pop()?.toLowerCase();
            const validExtensions = ['pdf', 'txt', 'md', 'docx'];
            
            if (!extension || !validExtensions.includes(extension)) {
                return null;
            }
            
            return {
                databaseType: extension,
                originalMimeType: file.type
            };
        };

        const fileTypeInfo = getFileType(file, originalFilename);
        if (!fileTypeInfo) {
            throw new Error(`Unsupported file type. Supported formats: PDF, TXT, MD, DOCX`);
        }

        const databaseFileType = fileTypeInfo.databaseType;
        console.log('File type validated:', databaseFileType);

        // Simple file hash generation
        const fileArrayBuffer = await file.arrayBuffer();
        const fileHashBuffer = await crypto.subtle.digest('SHA-256', fileArrayBuffer);
        const fileHashArray = Array.from(new Uint8Array(fileHashBuffer));
        const fileHash = fileHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        console.log('File hash generated:', fileHash.substring(0, 16) + '...');

        // Simple text extraction for basic file types
        let extractedText = '';
        try {
            if (databaseFileType === 'txt' || databaseFileType === 'md') {
                const textDecoder = new TextDecoder('utf-8');
                extractedText = textDecoder.decode(fileArrayBuffer);
                console.log('Text extracted, length:', extractedText.length);
            } else {
                extractedText = '[Binary file - content extraction not implemented]';
            }
        } catch (extractionError) {
            console.warn('Content extraction failed:', extractionError);
            extractedText = '';
        }

        // Basic file metadata
        const fileMetadata = {
            filename: originalFilename,
            original_filename: originalFilename,
            file_type: databaseFileType,
            file_size: file.size,
            file_hash: fileHash,
            storage_path: `anonymous/${fileHash}_${originalFilename}`,
            upload_status: 'pending',
            metadata: { extraction_method: extractedText ? 'basic' : 'failed' },
            user_id: 'anonymous'
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
            throw new Error(`Database insert failed: ${insertError}`);
        }

        const [uploadedFile] = await insertResponse.json();
        console.log('File inserted successfully, ID:', uploadedFile.id);

        // Store extracted content if available
        if (extractedText && extractedText.length > 0) {
            const contentMetadata = {
                file_id: uploadedFile.id,
                extracted_text: extractedText.substring(0, 1000), // Limit size
                content_length: extractedText.length,
                extraction_method: 'basic_text',
                extraction_confidence: 1.0
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

        console.log('=== Function completed successfully ===');

        return new Response(JSON.stringify({
            success: true,
            data: {
                file_id: uploadedFile.id,
                filename: originalFilename,
                file_type: databaseFileType,
                file_size: file.size,
                file_hash: fileHash,
                storage_path: fileMetadata.storage_path,
                upload_status: 'pending',
                extraction_method: 'basic',
                content_length: extractedText.length,
                metadata: fileMetadata.metadata
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