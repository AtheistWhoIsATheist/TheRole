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

    // Fetch RPE data
    const rpeResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpes?id=eq.${rpe_id}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const rpes = await rpeResponse.json();
    
    if (!rpes || rpes.length === 0) {
      throw new Error('RPE not found');
    }

    const rpe = rpes[0];

    // Fetch transcendence trajectory if exists
    const trajectoryResponse = await fetch(
      `${supabaseUrl}/rest/v1/transcendence_trajectories?rpe_id=eq.${rpe_id}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const trajectories = await trajectoryResponse.json();

    // Build trajectory data
    const trajectoryData = {
      rpe: {
        id: rpe.id,
        entity_id: rpe.entity_id,
        name: rpe.name,
        transcendence_score: rpe.transcendence_score || 0,
        void_resonance: rpe.void_resonance || 0,
        une_signature: rpe.une_signature,
      },
      trajectory: trajectories.length > 0 ? trajectories[0] : null,
      // Calculate journey stages based on scores
      journey_stages: [
        {
          stage: 'Void (Groundlessness)',
          position: 0,
          reached: true,
          intensity: rpe.void_resonance || 0,
        },
        {
          stage: 'Fracture',
          position: 20,
          reached: (rpe.transcendence_score || 0) >= 2,
          intensity: Math.min((rpe.transcendence_score || 0) * 2, 10),
        },
        {
          stage: 'Suspension',
          position: 40,
          reached: (rpe.transcendence_score || 0) >= 4,
          intensity: Math.min((rpe.transcendence_score || 0) * 2.5, 10),
        },
        {
          stage: 'Densification',
          position: 60,
          reached: (rpe.transcendence_score || 0) >= 6,
          intensity: Math.min((rpe.transcendence_score || 0) * 3, 10),
        },
        {
          stage: 'Attunement',
          position: 80,
          reached: (rpe.transcendence_score || 0) >= 8,
          intensity: Math.min((rpe.transcendence_score || 0) * 4, 10),
        },
        {
          stage: 'Theistic Placeholder (Transcendence)',
          position: 100,
          reached: (rpe.transcendence_score || 0) >= 9,
          intensity: rpe.transcendence_score || 0,
        },
      ],
    };

    return new Response(
      JSON.stringify({ data: trajectoryData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: { code: 'FUNCTION_ERROR', message: error.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
