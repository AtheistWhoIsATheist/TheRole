// Get PIS Entity - Retrieve any PIS entity with full details and relationships

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
        const url = new URL(req.url);
        const entityType = url.searchParams.get('entity_type');
        const entityId = url.searchParams.get('entity_id');

        if (!entityType || !entityId) {
            throw new Error('entity_type and entity_id are required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

        // Get main entity
        const entityResponse = await fetch(`${supabaseUrl}/rest/v1/pis_${entityType}s?id=eq.${entityId}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!entityResponse.ok) {
            throw new Error(`Entity not found: ${entityType}/${entityId}`);
        }

        const entity = (await entityResponse.json())[0];

        // Get related entities based on type
        const relatedData: any = {};

        // Get objections
        const objResponse = await fetch(`${supabaseUrl}/rest/v1/pis_objections?target_id=eq.${entityId}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        relatedData.objections = await objResponse.json();

        // Get provenance
        const provResponse = await fetch(`${supabaseUrl}/rest/v1/pis_provenance?entity_id=eq.${entityId}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        relatedData.provenance = await provResponse.json();

        // Type-specific relationships
        if (entityType === 'thesis') {
            // Get related RPE
            if (entity.related_rpe_id) {
                const rpeResponse = await fetch(`${supabaseUrl}/rest/v1/rpes?id=eq.${entity.related_rpe_id}`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                relatedData.rpe = (await rpeResponse.json())[0];
            }

            // Get related axiom
            if (entity.related_axiom_id) {
                const axiomResponse = await fetch(`${supabaseUrl}/rest/v1/axioms?id=eq.${entity.related_axiom_id}`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                relatedData.axiom = (await axiomResponse.json())[0];
            }

            // Get related scenarios
            const scenarioResponse = await fetch(`${supabaseUrl}/rest/v1/pis_scenarios?related_thesis=eq.${entityId}`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            relatedData.scenarios = await scenarioResponse.json();
        }

        if (entityType === 'argument') {
            // Get premise claims
            if (entity.premises && entity.premises.length > 0) {
                const premises = [];
                for (const premiseId of entity.premises) {
                    const premiseResponse = await fetch(`${supabaseUrl}/rest/v1/pis_claims?id=eq.${premiseId}`, {
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`
                        }
                    });
                    const premise = (await premiseResponse.json())[0];
                    if (premise) premises.push(premise);
                }
                relatedData.premises = premises;
            }

            // Get conclusion
            if (entity.conclusion_id) {
                const conclusionResponse = await fetch(`${supabaseUrl}/rest/v1/pis_claims?id=eq.${entity.conclusion_id}`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                relatedData.conclusion = (await conclusionResponse.json())[0];
            }
        }

        if (entityType === 'claim') {
            // Get source concepts
            if (entity.source_concepts && entity.source_concepts.length > 0) {
                const concepts = [];
                for (const conceptId of entity.source_concepts) {
                    const conceptResponse = await fetch(`${supabaseUrl}/rest/v1/pis_concepts?id=eq.${conceptId}`, {
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`
                        }
                    });
                    const concept = (await conceptResponse.json())[0];
                    if (concept) concepts.push(concept);
                }
                relatedData.concepts = concepts;
            }
        }

        return new Response(JSON.stringify({
            success: true,
            entity,
            related: relatedData
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get PIS Entity Error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
