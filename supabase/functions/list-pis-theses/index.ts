// List PIS Theses - Browse all theses with validation status and filtering

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
        const status = url.searchParams.get('status'); // validated, rejected, unverified, validating
        const domain = url.searchParams.get('domain');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

        // Build query
        let query = `${supabaseUrl}/rest/v1/pis_theses?select=*&order=created_at.desc&limit=${limit}`;
        
        if (status) {
            query += `&status=eq.${status}`;
        }
        
        if (domain) {
            query += `&domain=eq.${domain}`;
        }

        const thesesResponse = await fetch(query, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        const theses = await thesesResponse.json();

        // Enrich with related data
        const enrichedTheses = await Promise.all(theses.map(async (thesis: any) => {
            const enriched: any = { ...thesis };

            // Get objection count
            const objResponse = await fetch(`${supabaseUrl}/rest/v1/pis_objections?target_id=eq.${thesis.id}&target_type=eq.thesis`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            const objections = await objResponse.json();
            enriched.objection_count = objections.length;

            // Get related RPE name if exists
            if (thesis.related_rpe_id) {
                const rpeResponse = await fetch(`${supabaseUrl}/rest/v1/rpes?id=eq.${thesis.related_rpe_id}&select=name,entity_id`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                const rpe = (await rpeResponse.json())[0];
                enriched.rpe_name = rpe?.name;
                enriched.rpe_entity_id = rpe?.entity_id;
            }

            // Calculate gate success rate
            const gates = [thesis.gate_g1, thesis.gate_g2, thesis.gate_g3, thesis.gate_g4, thesis.gate_g5, thesis.gate_g6];
            const passedGates = gates.filter(g => g === true).length;
            enriched.gate_success_rate = (passedGates / 6) * 100;

            return enriched;
        }));

        // Calculate statistics
        const stats = {
            total: enrichedTheses.length,
            validated: enrichedTheses.filter(t => t.status === 'validated').length,
            rejected: enrichedTheses.filter(t => t.status === 'rejected').length,
            unverified: enrichedTheses.filter(t => t.status === 'unverified').length,
            average_gate_success: enrichedTheses.reduce((sum, t) => sum + t.gate_success_rate, 0) / enrichedTheses.length || 0
        };

        return new Response(JSON.stringify({
            success: true,
            theses: enrichedTheses,
            statistics: stats
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('List Theses Error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
