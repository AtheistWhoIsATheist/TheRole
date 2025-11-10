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

        const url = new URL(req.url);
        const searchTerm = url.searchParams.get('search') || '';
        const domain = url.searchParams.get('domain') || '';
        const limit = url.searchParams.get('limit') || '50';

        let apiUrl = `${supabaseUrl}/rest/v1/training_corpus?order=example_index.asc&limit=${limit}`;
        
        if (searchTerm) {
            apiUrl += `&source_text=ilike.*${searchTerm}*`;
        }
        
        if (domain) {
            apiUrl += `&philosophical_domain=eq.${domain}`;
        }

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const data = await response.json();

        return new Response(JSON.stringify({ data }), {
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
