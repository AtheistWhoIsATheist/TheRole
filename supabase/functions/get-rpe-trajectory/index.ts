Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        // Fetch RPE data
        const rpeResponse = await fetch(`${supabaseUrl}/rest/v1/rpes?id=eq.${rpe_id}&select=id,entity_id,name,transcendence_score,void_resonance,une_signature`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        const rpeData = await rpeResponse.json();

        if (rpeData.length === 0) {
            throw new Error('RPE not found');
        }

        const rpe = rpeData[0];

        // Fetch trajectory data
        const trajectoryResponse = await fetch(`${supabaseUrl}/rest/v1/transcendence_trajectories?rpe_id=eq.${rpe_id}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        const trajectoryData = await trajectoryResponse.json();

        // Define the 5 stages of ENPAS methodology
        const journeyStages = [
            {
                stage: 'Groundlessness',
                position: 0,
                reached: rpe.transcendence_score >= 2,
                intensity: Math.min(rpe.transcendence_score, 10)
            },
            {
                stage: 'Fracture',
                position: 20,
                reached: rpe.transcendence_score >= 4,
                intensity: Math.min(rpe.transcendence_score, 10)
            },
            {
                stage: 'Suspension',
                position: 40,
                reached: rpe.transcendence_score >= 6,
                intensity: Math.min(rpe.transcendence_score, 10)
            },
            {
                stage: 'Densification',
                position: 60,
                reached: rpe.transcendence_score >= 8,
                intensity: Math.min(rpe.transcendence_score, 10)
            },
            {
                stage: 'Attunement',
                position: 80,
                reached: rpe.transcendence_score >= 10,
                intensity: Math.min(rpe.transcendence_score, 10)
            },
            {
                stage: 'Theistic Placeholder',
                position: 100,
                reached: rpe.une_signature === 'Echo' || rpe.transcendence_score === 10,
                intensity: rpe.une_signature === 'Echo' ? 10 : rpe.transcendence_score
            }
        ];

        // If no trajectory exists in DB, create default one based on RPE data
        let trajectorySteps = [];
        if (trajectoryData.length > 0) {
            trajectorySteps = trajectoryData[0].trajectory_steps || journeyStages;
        } else {
            trajectorySteps = journeyStages;
        }

        return new Response(JSON.stringify({
            data: {
                rpe: rpe,
                journey_stages: journeyStages
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