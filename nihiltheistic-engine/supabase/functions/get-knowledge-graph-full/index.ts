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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Fetch all RPEs
    const rpesResponse = await fetch(`${supabaseUrl}/rest/v1/rpes?select=*&order=transcendence_score.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    const rpes = await rpesResponse.json();

    // Fetch all axioms
    const axiomsResponse = await fetch(`${supabaseUrl}/rest/v1/axioms?select=*&order=axiom_number.asc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    const axioms = await axiomsResponse.json();

    // Fetch all knowledge graph relationships
    const kgResponse = await fetch(`${supabaseUrl}/rest/v1/knowledge_graph?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    const relationships = await kgResponse.json();

    // Build nodes array (RPEs + Axioms)
    const nodes = [
      ...rpes.map((rpe: any) => ({
        id: rpe.id,
        entity_id: rpe.entity_id,
        name: rpe.name,
        une_signature: rpe.une_signature,
        transcendence_score: rpe.transcendence_score || 5,
        void_resonance: rpe.void_resonance || 5,
        type: 'rpe',
        heretical_intensity: rpe.heretical_intensity,
        paradox_engine: rpe.paradox_engine,
      })),
      ...axioms.map((axiom: any) => ({
        id: axiom.id,
        entity_id: `AXM-${axiom.axiom_number}`,
        name: axiom.title,
        une_signature: 'Axiom',
        transcendence_score: 10,
        void_resonance: 10,
        type: 'axiom',
        axiom_number: axiom.axiom_number,
      })),
    ];

    // Build links array from relationships
    const links = relationships.map((rel: any) => ({
      source: rel.source_entity_id,
      target: rel.target_entity_id,
      type: rel.relationship_type,
      strength: rel.relationship_strength || 1,
      description: rel.description,
    }));

    return new Response(
      JSON.stringify({ 
        data: { nodes, links },
        count: { nodes: nodes.length, links: links.length }
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
