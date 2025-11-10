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
        const { concept } = await req.json();

        if (!concept) {
            throw new Error('Concept is required');
        }

        // Analyze concept to determine UNE classification
        const une = classifyUNE(concept);

        return new Response(JSON.stringify({
            data: {
                concept,
                une_classification: une
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: {
                code: 'CLASSIFICATION_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

function classifyUNE(concept: string): any {
    const lowerConcept = concept.toLowerCase();
    
    // Pre-UNE: Conventional understanding
    if (lowerConcept.includes('should') || lowerConcept.includes('ought') || 
        lowerConcept.includes('normal') || lowerConcept.includes('traditional')) {
        return {
            phase: 'Pre-UNE',
            description: 'Conventional understanding before encountering groundlessness',
            characteristics: 'Unexamined assumptions, false security, belief in inherent meaning',
            transcendence_potential: 'Low - still operating within conventional frameworks'
        };
    }
    
    // UNE-Rupture: Crisis point
    if (lowerConcept.includes('meaning') || lowerConcept.includes('purpose') || 
        lowerConcept.includes('why') || lowerConcept.includes('absurd') ||
        lowerConcept.includes('nothing') || lowerConcept.includes('void')) {
        return {
            phase: 'UNE-Rupture',
            description: 'The moment of encountering absolute void',
            characteristics: 'Ontological crisis, collapse of grounds, total instability',
            transcendence_potential: 'High - at the rupture point where transformation occurs'
        };
    }
    
    // Echo: Theistic placeholder emergence
    if (lowerConcept.includes('god') || lowerConcept.includes('divine') || 
        lowerConcept.includes('ultimate') || lowerConcept.includes('absolute') ||
        lowerConcept.includes('transcend')) {
        return {
            phase: 'Echo',
            description: 'Emergence of theistic placeholder function',
            characteristics: 'Full theistic placeholder, meta-recursive transcendence',
            transcendence_potential: 'Maximum - theistic function fully recognized'
        };
    }
    
    // Default: Post-UNE
    return {
        phase: 'Post-UNE',
        description: 'Living with recognition of groundlessness',
        characteristics: 'Void-consciousness, dynamic instability, paradox engine activation',
        transcendence_potential: 'Moderate - integrated awareness of groundlessness'
    };
}
