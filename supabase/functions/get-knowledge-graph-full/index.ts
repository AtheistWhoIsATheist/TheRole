Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Allow-Origin': '*',
        'Access-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Fetch RPEs for nodes
        const rpeResponse = await fetch(`${supabaseUrl}/rest/v1/rpes?select=id,entity_id,name,une_signature,transcendence_score,void_resonance,heretical_intensity,paradox_engine`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const rpes = await rpeResponse.json();

        // Fetch axioms for nodes
        const axiomResponse = await fetch(`${supabaseUrl}/rest/v1/axioms?select=id,axiom_number,title,core_insight`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const axioms = await axiomResponse.json();

        // Fetch uploaded files for nodes
        const fileResponse = await fetch(`${supabaseUrl}/rest/v1/uploaded_files?select=id,filename,file_type,file_size,upload_status,metadata`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const uploadedFiles = await fileResponse.json();

        // Fetch file-to-RPE relationships
        const fileRpeResponse = await fetch(`${supabaseUrl}/rest/v1/file_rpe_relationships?select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const fileRpeRelationships = await fileRpeResponse.json();

        // Fetch knowledge graph relationships
        const kgResponse = await fetch(`${supabaseUrl}/rest/v1/knowledge_graph?select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const relationships = await kgResponse.json();

        // Build nodes array with RPEs, axioms, and uploaded files
        const nodes = [
            // Add RPE nodes
            ...rpes.map((rpe: any) => ({
                id: rpe.id,
                entity_id: rpe.entity_id,
                name: rpe.name,
                une_signature: rpe.une_signature,
                transcendence_score: rpe.transcendence_score,
                void_resonance: rpe.void_resonance,
                heretical_intensity: rpe.heretical_intensity,
                paradox_engine: rpe.paradox_engine,
                type: 'rpe'
            })),
            // Add axiom nodes
            ...axioms.map((axiom: any) => ({
                id: axiom.id,
                entity_id: `axiom-${axiom.axiom_number}`,
                name: axiom.title || `Axiom ${axiom.axiom_number}`,
                une_signature: 'axiom',
                transcendence_score: 0,
                void_resonance: 0,
                type: 'axiom',
                axiom_number: axiom.axiom_number
            })),
            // Add file nodes
            ...uploadedFiles.map((file: any) => ({
                id: file.id,
                entity_id: `file-${file.id}`,
                name: file.filename,
                une_signature: 'document',
                transcendence_score: 0,
                void_resonance: 0,
                type: 'file',
                file_type: file.file_type,
                file_size: file.file_size,
                upload_status: file.upload_status,
                metadata: file.metadata || {}
            }))
        ];

        // Build ID mapping from entity_id to node id
        const entityIdToNodeId = new Map();
        rpes.forEach((rpe: any) => {
            entityIdToNodeId.set(rpe.entity_id, rpe.id);
        });
        axioms.forEach((axiom: any) => {
            entityIdToNodeId.set(`axiom-${axiom.axiom_number}`, axiom.id);
        });
        uploadedFiles.forEach((file: any) => {
            entityIdToNodeId.set(`file-${file.id}`, file.id);
        });

        // Build links array from knowledge_graph table with ID validation
        const links = [];
        const invalidReferences = [];
        
        relationships.forEach((rel: any) => {
            const sourceNodeId = entityIdToNodeId.get(rel.source_entity_id);
            const targetNodeId = entityIdToNodeId.get(rel.target_entity_id);
            
            if (sourceNodeId && targetNodeId) {
                links.push({
                    source: sourceNodeId,
                    target: targetNodeId,
                    type: rel.relationship_type,
                    strength: rel.relationship_strength,
                    description: rel.description || ''
                });
            } else {
                invalidReferences.push({
                    link: rel,
                    missingSource: !sourceNodeId,
                    missingTarget: !targetNodeId
                });
            }
        });

        // Log any invalid references for debugging
        if (invalidReferences.length > 0) {
            console.warn('Knowledge Graph: Found invalid node references:', invalidReferences);
        }

        // Add cross-axiom relationships (RPE to Axiom connections)
        rpes.forEach((rpe: any) => {
            // Check if this RPE has a direct axiom relationship
            const rpeAxiom = axioms.find((axiom: any) => axiom.rpe_id === rpe.id);
            if (rpeAxiom) {
                links.push({
                    source: rpe.id,
                    target: rpeAxiom.id,
                    type: 'foundational_basis',
                    strength: 8.0,
                    description: `RPE based on ${rpeAxiom.title}`
                });
            }
        });

        // Add file-to-RPE relationships
        fileRpeRelationships.forEach((relationship: any) => {
            links.push({
                source: relationship.file_id,
                target: relationship.rpe_id,
                type: relationship.relationship_type || 'generated_from',
                strength: relationship.relationship_strength || 5.0,
                description: `File contains or generates ${relationship.relationship_type || 'content'}`,
                confidence: relationship.confidence_score || 1.0
            });
        });

        // Add file-to-file similarity connections
        // Group files by shared RPEs
        const fileRpeMap = new Map();
        fileRpeRelationships.forEach((rel: any) => {
            if (!fileRpeMap.has(rel.rpe_id)) {
                fileRpeMap.set(rel.rpe_id, []);
            }
            fileRpeMap.get(rel.rpe_id).push(rel.file_id);
        });

        // Create similarity edges between files that share RPEs
        fileRpeMap.forEach((filesWithRpe, rpeId) => {
            if (filesWithRpe.length > 1) {
                // Create connections between all pairs of files that share this RPE
                for (let i = 0; i < filesWithRpe.length; i++) {
                    for (let j = i + 1; j < filesWithRpe.length; j++) {
                        const file1 = filesWithRpe[i];
                        const file2 = filesWithRpe[j];
                        
                        // Check if this similarity edge already exists
                        const existingEdge = links.find(link => 
                            (link.source === file1 && link.target === file2 && link.type === 'similar_to') ||
                            (link.source === file2 && link.target === file1 && link.type === 'similar_to')
                        );
                        
                        if (!existingEdge) {
                            links.push({
                                source: file1,
                                target: file2,
                                type: 'similar_to',
                                strength: 3.0, // Lower strength for similarity vs direct relationships
                                description: 'Files share philosophical concepts',
                                confidence: 0.8
                            });
                        }
                    }
                }
            }
        });

        return new Response(JSON.stringify({
            data: {
                nodes,
                links
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: {
                code: 'FETCH_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});