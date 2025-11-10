// Minimal test version of process-file-content
Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { file_id } = await req.json();
        
        if (!file_id) {
            throw new Error('file_id is required');
        }

        // Get Supabase configuration
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Missing Supabase configuration');
        }

        console.log(`Processing file: ${file_id}`);

        // Get file content
        const fileResponse = await fetch(`${supabaseUrl}/rest/v1/file_content?file_id=eq.${file_id}&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!fileResponse.ok) {
            throw new Error('Failed to fetch file content');
        }

        const fileContent = await fileResponse.json();
        if (!fileContent || fileContent.length === 0) {
            throw new Error('No file content found');
        }

        const content = fileContent[0];
        console.log('File content found, length:', content.extracted_text?.length || 0);

        // Simple text processing to extract concepts
        const text = content.extracted_text || '';
        
        // Split by multiple criteria to handle markdown and regular text
        const sentences = text
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .split(/[.!?]+|\n+/)
            .map(s => s.trim())
            .filter(s => s.length > 10);
        
        console.log(`Found ${sentences.length} sentences:`, sentences.map(s => s.substring(0, 50) + '...'));
        
        let rpeEntities = [];
        let relationships = [];

        // Create RPE entities from content
        if (sentences.length === 0) {
            // Fallback: use the entire text as a single concept
            const entity = {
                entity_id: `RPE-${Date.now()}-DOCUMENT`,
                name: text.substring(0, 100),
                core_fracture: text,
                transcendence_score: 0.6,
                recursion_depth: 1,
                void_vectors: {},
                aporia_markers: [],
                pis_validation_status: 'pending',
                pis_validation_summary: 'Auto-generated from file processing',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            rpeEntities.push(entity);
        } else {
            // Use sentences as individual concepts
            for (let i = 0; i < Math.min(sentences.length, 3); i++) {
                const sentence = sentences[i].trim();
                if (sentence.length > 0) {
                    const entity = {
                        entity_id: `RPE-${Date.now()}-CONCEPT-${i + 1}`,
                        name: sentence.substring(0, 100),
                        core_fracture: sentence,
                        transcendence_score: 0.8,
                        recursion_depth: 1,
                        void_vectors: {},
                        aporia_markers: [],
                        pis_validation_status: 'pending',
                        pis_validation_summary: 'Auto-generated from file processing',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    rpeEntities.push(entity);
                }
            }
        }

        // Create RPE entities in database
        let createdEntities = [];
        for (const entity of rpeEntities) {
            try {
                const createResponse = await fetch(`${supabaseUrl}/rest/v1/rpes`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(entity)
                });

                if (createResponse.ok) {
                    const [createdEntity] = await createResponse.json();
                    createdEntities.push(createdEntity);
                }
            } catch (error) {
                console.warn('Failed to create RPE entity:', error);
            }
        }

        // Create file-RPE relationships
        for (const entity of createdEntities) {
            try {
                const relationship = {
                    file_id: file_id,
                    rpe_id: entity.id,
                    relationship_type: 'contains',
                    relationship_strength: 0.8,
                    confidence_score: 0.8,
                    context_text: entity.core_fracture.substring(0, 200),
                    created_at: new Date().toISOString()
                };

                const relResponse = await fetch(`${supabaseUrl}/rest/v1/file_rpe_relationships`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(relationship)
                });

                if (relResponse.ok) {
                    relationships.push(relationship);
                } else {
                    console.warn('Relationship creation failed:', await relResponse.text());
                }
            } catch (error) {
                console.warn('Failed to create relationship:', error);
            }
        }

        // Create processing session
        await fetch(`${supabaseUrl}/rest/v1/file_processing_sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_id: file_id,
                processing_status: 'completed',
                processing_steps: [
                    { step: 'content_extraction', status: 'completed', timestamp: new Date().toISOString() },
                    { step: 'rpe_generation', status: 'completed', timestamp: new Date().toISOString() },
                    { step: 'relationship_creation', status: 'completed', timestamp: new Date().toISOString() }
                ],
                completed_at: new Date().toISOString()
            })
        });

        console.log(`Created ${createdEntities.length} RPE entities and ${relationships.length} relationships`);

        return new Response(JSON.stringify({
            success: true,
            data: {
                file_id: file_id,
                processing_status: 'completed',
                rpe_entities_created: createdEntities.length,
                relationships_created: relationships.length,
                message: 'File processing completed successfully'
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('File processing error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'PROCESSING_FAILED',
                message: error.message || 'File processing failed'
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});