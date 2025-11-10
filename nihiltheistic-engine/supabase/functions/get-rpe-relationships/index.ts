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
    const { rpe_id } = await req.json();

    if (!rpe_id) {
      throw new Error('rpe_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Fetch relationships where this RPE is the source
    const outgoingResponse = await fetch(
      `${supabaseUrl}/rest/v1/knowledge_graph?source_entity_id=eq.${rpe_id}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const outgoing = await outgoingResponse.json();

    // Fetch relationships where this RPE is the target
    const incomingResponse = await fetch(
      `${supabaseUrl}/rest/v1/knowledge_graph?target_entity_id=eq.${rpe_id}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const incoming = await incomingResponse.json();

    // Fetch related axioms
    const axiomIds = [
      ...outgoing.map((r: any) => r.target_entity_id),
      ...incoming.map((r: any) => r.source_entity_id),
    ].filter((id: string, index: number, self: string[]) => self.indexOf(id) === index);

    let relatedAxioms = [];
    let relatedRPEs = [];

    if (axiomIds.length > 0) {
      const axiomsResponse = await fetch(
        `${supabaseUrl}/rest/v1/axioms?id=in.(${axiomIds.join(',')})&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      relatedAxioms = await axiomsResponse.json();

      const rpesResponse = await fetch(
        `${supabaseUrl}/rest/v1/rpes?id=in.(${axiomIds.join(',')})&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      relatedRPEs = await rpesResponse.json();
    }

    return new Response(
      JSON.stringify({
        data: {
          outgoing_relationships: outgoing,
          incoming_relationships: incoming,
          related_axioms: relatedAxioms,
          related_rpes: relatedRPEs,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: { code: 'FUNCTION_ERROR', message: error.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
