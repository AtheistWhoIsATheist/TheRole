Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Allow-Origin': '*',
        'Access-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { rpe_id } = await req.json();
        
        if (!rpe_id) {
            throw new Error('RPE ID is required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Fetch outgoing relationships (RPE -> other entities)
        const outgoingResponse = await fetch(`${supabaseUrl}/rest/v1/knowledge_graph?source_entity_id=eq.${rpe_id}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        const outgoingRelationships = await outgoingResponse.json();

        // Fetch incoming relationships (other entities -> RPE)
        const incomingResponse = await fetch(`${supabaseUrl}/rest/v1/knowledge_graph?target_entity_id=eq.${rpe_id}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        const incomingRelationships = await incomingResponse.json();

        // Fetch related axioms (through direct relationship or via RPE-axiom connection)
        const axiomResponse = await fetch(`${supabaseUrl}/rest/v1/axioms?rpe_id=eq.${rpe_id}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        const relatedAxioms = await axiomResponse.json();

        // Fetch related RPEs through relationships
        const relatedRpeIds = [
            ...outgoingRelationships.map((rel: any) => rel.target_entity_id),
            ...incomingRelationships.map((rel: any) => rel.source_entity_id)
        ].filter((id, index, self) => id !== rpe_id && self.indexOf(id) === index);

        let relatedRPEs = [];
        if (relatedRpeIds.length > 0) {
            const rpeIdsQuery = relatedRpeIds.map(id => `id.eq.${id}`).join(',');
            const relatedRpeResponse = await fetch(`${supabaseUrl}/rest/v1/rpes?or=(${rpeIdsQuery})&select=id,entity_id,name,une_signature`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });
            relatedRPEs = await relatedRpeResponse.json();
        }

        // Process and enhance relationship data
        const processedOutgoing = outgoingRelationships.map((rel: any) => ({
            relationship_type: rel.relationship_type,
            relationship_strength: rel.relationship_strength,
            description: rel.description || '',
            target_id: rel.target_entity_id,
            target_type: rel.target_entity_id.startsWith('axiom-') ? 'axiom' : 'rpe'
        }));

        const processedIncoming = incomingRelationships.map((rel: any) => ({
            relationship_type: rel.relationship_type,
            relationship_strength: rel.relationship_strength,
            description: rel.description || '',
            source_id: rel.source_entity_id,
            source_type: rel.source_entity_id.startsWith('axiom-') ? 'axiom' : 'rpe'
        }));

        return new Response(JSON.stringify({
            data: {
                outgoing_relationships: processedOutgoing,
                incoming_relationships: processedIncoming,
                related_axioms: relatedAxioms.map((axiom: any) => ({
                    id: axiom.id,
                    axiom_number: axiom.axiom_number,
                    title: axiom.title,
                    core_insight: axiom.core_insight
                })),
                related_rpes: relatedRPEs
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