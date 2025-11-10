Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        const axiomResponse = await fetch(`${supabaseUrl}/rest/v1/axioms?select=id,axiom_number,title`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const axioms = await axiomResponse.json();

        // Fetch knowledge graph relationships
        const kgResponse = await fetch(`${supabaseUrl}/rest/v1/knowledge_graph?select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const relationships = await kgResponse.json();

        // Build nodes array with both RPEs and axioms
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
            }))
        ];

        // Build links array from knowledge_graph table
        const links = relationships.map((rel: any) => ({
            source: rel.source_entity_id,
            target: rel.target_entity_id,
            type: rel.relationship_type,
            strength: rel.relationship_strength,
            description: rel.description || ''
        }));

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
