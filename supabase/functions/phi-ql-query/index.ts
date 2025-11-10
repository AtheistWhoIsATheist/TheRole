// Phi-QL Query Engine - WHY, COUNTEREX, REPAIR, TRACE queries for philosophical analysis

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
        const { query_type, entity_type, entity_id, parameters } = await req.json();
        const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

        let result;

        switch (query_type) {
            case 'WHY':
                result = await handleWhyQuery(entity_type, entity_id, supabaseUrl, supabaseKey);
                break;
            case 'COUNTEREX':
                result = await handleCounterexQuery(entity_type, entity_id, parameters, supabaseUrl, supabaseKey);
                break;
            case 'REPAIR':
                result = await handleRepairQuery(entity_type, entity_id, parameters, supabaseUrl, supabaseKey);
                break;
            case 'TRACE':
                result = await handleTraceQuery(entity_type, entity_id, supabaseUrl, supabaseKey);
                break;
            default:
                throw new Error(`Unknown query type: ${query_type}`);
        }

        return new Response(JSON.stringify({
            success: true,
            query_type,
            result
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Phi-QL Query Error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// WHY: Returns minimal support set and provenance tree
async function handleWhyQuery(entityType: string, entityId: string, supabaseUrl: string, supabaseKey: string) {
    // Get entity
    const entityResponse = await fetch(`${supabaseUrl}/rest/v1/pis_${entityType}s?id=eq.${entityId}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const entity = (await entityResponse.json())[0];

    if (!entity) {
        throw new Error(`Entity not found: ${entityType}/${entityId}`);
    }

    // Get provenance trail
    const provResponse = await fetch(`${supabaseUrl}/rest/v1/pis_provenance?entity_id=eq.${entityId}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const provenance = await provResponse.json();

    // Build support set based on entity type
    const supportSet = await buildSupportSet(entityType, entity, supabaseUrl, supabaseKey);

    // Build provenance tree
    const provenanceTree = await buildProvenanceTree(provenance, supabaseUrl, supabaseKey);

    return {
        entity,
        support_set: supportSet,
        provenance_tree: provenanceTree,
        explanation: generateWhyExplanation(entity, supportSet)
    };
}

// COUNTEREX: Generates counterexamples for claims/theses
async function handleCounterexQuery(entityType: string, entityId: string, parameters: any, supabaseUrl: string, supabaseKey: string) {
    // Get entity
    const entityResponse = await fetch(`${supabaseUrl}/rest/v1/pis_${entityType}s?id=eq.${entityId}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const entity = (await entityResponse.json())[0];

    if (!entity) {
        throw new Error(`Entity not found: ${entityType}/${entityId}`);
    }

    const statement = entity.statement || entity.hypothesis;

    // Get existing objections
    const objResponse = await fetch(`${supabaseUrl}/rest/v1/pis_objections?target_id=eq.${entityId}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const existingObjections = await objResponse.json();

    // Generate new counterexamples
    const newCounterexamples = generateCounterexamples(statement, parameters);

    // Store new counterexamples
    for (const ce of newCounterexamples) {
        await fetch(`${supabaseUrl}/rest/v1/pis_objections`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_type: entityType,
                target_id: entityId,
                objection_statement: ce.objection,
                attack_type: 'counterexample',
                strength_score: ce.strength
            })
        });
    }

    return {
        entity,
        existing_objections: existingObjections,
        new_counterexamples: newCounterexamples,
        total_count: existingObjections.length + newCounterexamples.length
    };
}

// REPAIR: Proposes argument repairs
async function handleRepairQuery(entityType: string, entityId: string, parameters: any, supabaseUrl: string, supabaseKey: string) {
    // Get entity
    const entityResponse = await fetch(`${supabaseUrl}/rest/v1/pis_${entityType}s?id=eq.${entityId}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const entity = (await entityResponse.json())[0];

    if (!entity) {
        throw new Error(`Entity not found: ${entityType}/${entityId}`);
    }

    // Get objections to address
    const objResponse = await fetch(`${supabaseUrl}/rest/v1/pis_objections?target_id=eq.${entityId}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const objections = await objResponse.json();

    // Analyze validation status if thesis
    let gateFailures: any[] = [];
    if (entityType === 'thesis') {
        gateFailures = analyzeGateFailures(entity);
    }

    // Generate repairs
    const repairs = generateRepairs(entity, objections, gateFailures, parameters);

    // Create repair scenarios
    const scenarios = [];
    for (const repair of repairs.slice(0, 3)) {
        const scenarioResponse = await fetch(`${supabaseUrl}/rest/v1/pis_scenarios`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                description: repair.description,
                parameters: repair.parameters,
                domain: 'repair',
                related_thesis: entityType === 'thesis' ? entityId : null
            })
        });
        scenarios.push((await scenarioResponse.json())[0]);
    }

    return {
        entity,
        objections_addressed: objections.length,
        gate_failures: gateFailures,
        repairs,
        repair_scenarios: scenarios
    };
}

// TRACE: Tracks complete validation pathway
async function handleTraceQuery(entityType: string, entityId: string, supabaseUrl: string, supabaseKey: string) {
    // Get entity
    const entityResponse = await fetch(`${supabaseUrl}/rest/v1/pis_${entityType}s?id=eq.${entityId}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const entity = (await entityResponse.json())[0];

    if (!entity) {
        throw new Error(`Entity not found: ${entityType}/${entityId}`);
    }

    // Get complete provenance chain
    const provResponse = await fetch(`${supabaseUrl}/rest/v1/pis_provenance?entity_id=eq.${entityId}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const provenance = await provResponse.json();

    // Get all related entities
    const relatedEntities = await gatherRelatedEntities(entity, entityType, supabaseUrl, supabaseKey);

    // Build validation timeline
    const timeline = buildValidationTimeline(entity, provenance, relatedEntities);

    // Get run records if available
    const runsResponse = await fetch(`${supabaseUrl}/rest/v1/pis_runs?input_parameters->>entity_id=eq.${entityId}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const runs = await runsResponse.json();

    return {
        entity,
        provenance_chain: provenance,
        related_entities: relatedEntities,
        validation_timeline: timeline,
        experiment_runs: runs,
        trace_summary: generateTraceSummary(entity, provenance, timeline)
    };
}

// Helper: Build support set for entity
async function buildSupportSet(entityType: string, entity: any, supabaseUrl: string, supabaseKey: string) {
    const supportSet: any = {
        premises: [],
        axioms: [],
        concepts: [],
        norms: []
    };

    if (entityType === 'argument') {
        // Get premise claims
        if (entity.premises && entity.premises.length > 0) {
            for (const premiseId of entity.premises) {
                const response = await fetch(`${supabaseUrl}/rest/v1/pis_claims?id=eq.${premiseId}`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                const premise = (await response.json())[0];
                if (premise) supportSet.premises.push(premise);
            }
        }
    }

    if (entityType === 'thesis') {
        // Get related axioms
        if (entity.related_axiom_id) {
            const response = await fetch(`${supabaseUrl}/rest/v1/axioms?id=eq.${entity.related_axiom_id}`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            const axiom = (await response.json())[0];
            if (axiom) supportSet.axioms.push(axiom);
        }
    }

    if (entityType === 'claim') {
        // Get source concepts
        if (entity.source_concepts && entity.source_concepts.length > 0) {
            for (const conceptId of entity.source_concepts) {
                const response = await fetch(`${supabaseUrl}/rest/v1/pis_concepts?id=eq.${conceptId}`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                const concept = (await response.json())[0];
                if (concept) supportSet.concepts.push(concept);
            }
        }
    }

    return supportSet;
}

// Helper: Build provenance tree
async function buildProvenanceTree(provenance: any[], supabaseUrl: string, supabaseKey: string) {
    const tree: any = {
        roots: [],
        nodes: []
    };

    for (const prov of provenance) {
        const node: any = {
            id: prov.id,
            entity_type: prov.entity_type,
            entity_id: prov.entity_id,
            generated_by: prov.was_generated_by,
            derived_from: prov.was_derived_from || [],
            attributed_to: prov.was_attributed_to,
            timestamp: prov.generated_at,
            children: []
        };

        // Get derived entities
        if (prov.was_derived_from && prov.was_derived_from.length > 0) {
            for (const sourceId of prov.was_derived_from) {
                const childProvResponse = await fetch(`${supabaseUrl}/rest/v1/pis_provenance?entity_id=eq.${sourceId}`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                const childProv = await childProvResponse.json();
                if (childProv.length > 0) {
                    node.children.push(childProv[0]);
                }
            }
        }

        tree.nodes.push(node);
        
        if (!prov.was_derived_from || prov.was_derived_from.length === 0) {
            tree.roots.push(node);
        }
    }

    return tree;
}

// Helper: Generate WHY explanation
function generateWhyExplanation(entity: any, supportSet: any): string {
    const parts = [];

    if (supportSet.premises.length > 0) {
        parts.push(`Based on ${supportSet.premises.length} premises`);
    }

    if (supportSet.axioms.length > 0) {
        parts.push(`grounded in ${supportSet.axioms.length} foundational axiom(s)`);
    }

    if (supportSet.concepts.length > 0) {
        parts.push(`using ${supportSet.concepts.length} key concept(s)`);
    }

    if (parts.length === 0) {
        return 'This entity is a root assertion without explicit support';
    }

    return parts.join(', ');
}

// Helper: Generate counterexamples
function generateCounterexamples(statement: string, parameters: any) {
    const counterexamples = [];
    const normalized = statement.toLowerCase();

    // Universal claims
    if (/\b(all|every|always|never|none)\b/.test(normalized)) {
        counterexamples.push({
            objection: 'Existential counterexample: Consider a specific case where the universal claim fails',
            strength: 0.7,
            type: 'universal_negation'
        });
    }

    // Necessity claims
    if (/\b(must|necessary|required|essential)\b/.test(normalized)) {
        counterexamples.push({
            objection: 'Sufficiency counterexample: Alternative paths exist without this necessity',
            strength: 0.6,
            type: 'necessity_challenge'
        });
    }

    // Causal claims
    if (/\b(cause|lead|result|because)\b/.test(normalized)) {
        counterexamples.push({
            objection: 'Causal counterexample: Correlation may exist without causation',
            strength: 0.5,
            type: 'correlation_causation'
        });
    }

    // Temporal claims
    if (/\b(when|before|after|during)\b/.test(normalized)) {
        counterexamples.push({
            objection: 'Temporal counterexample: Timeline may vary in different contexts',
            strength: 0.4,
            type: 'temporal_variance'
        });
    }

    return counterexamples;
}

// Helper: Analyze gate failures
function analyzeGateFailures(thesis: any) {
    const failures = [];

    if (!thesis.gate_g1) failures.push({ gate: 'G1', issue: 'Vocabulary consistency failure' });
    if (!thesis.gate_g2) failures.push({ gate: 'G2', issue: 'Formalization incomplete' });
    if (!thesis.gate_g3) failures.push({ gate: 'G3', issue: 'Proof soundness issue' });
    if (!thesis.gate_g4) failures.push({ gate: 'G4', issue: 'Strong counterexamples exist' });
    if (!thesis.gate_g5) failures.push({ gate: 'G5', issue: 'Too many unresolved issues' });
    if (!thesis.gate_g6) failures.push({ gate: 'G6', issue: 'Axiom coherence low' });

    return failures;
}

// Helper: Generate repairs
function generateRepairs(entity: any, objections: any[], gateFailures: any[], parameters: any) {
    const repairs = [];

    // Address gate failures
    for (const failure of gateFailures) {
        switch (failure.gate) {
            case 'G1':
                repairs.push({
                    type: 'vocabulary',
                    description: 'Standardize philosophical terms using approved glossary',
                    parameters: { action: 'term_replacement', priority: 'high' }
                });
                break;
            case 'G2':
                repairs.push({
                    type: 'formalization',
                    description: 'Restructure claims for formal logic representation',
                    parameters: { action: 'claim_restructure', priority: 'high' }
                });
                break;
            case 'G3':
                repairs.push({
                    type: 'proof',
                    description: 'Strengthen inference patterns and eliminate contradictions',
                    parameters: { action: 'logic_repair', priority: 'critical' }
                });
                break;
            case 'G4':
                repairs.push({
                    type: 'counterexample',
                    description: 'Add constraints to eliminate counterexamples',
                    parameters: { action: 'scope_restriction', priority: 'medium' }
                });
                break;
            case 'G5':
                repairs.push({
                    type: 'elaboration',
                    description: 'Expand argumentation with additional premises',
                    parameters: { action: 'premise_addition', priority: 'medium' }
                });
                break;
            case 'G6':
                repairs.push({
                    type: 'coherence',
                    description: 'Align language and concepts with foundational axioms',
                    parameters: { action: 'axiom_alignment', priority: 'high' }
                });
                break;
        }
    }

    // Address strong objections
    const strongObjections = objections.filter(obj => obj.strength_score > 0.6);
    for (const obj of strongObjections) {
        repairs.push({
            type: 'objection_response',
            description: `Address ${obj.attack_type}: ${obj.objection_statement.substring(0, 100)}`,
            parameters: { objection_id: obj.id, priority: 'high' }
        });
    }

    return repairs;
}

// Helper: Gather related entities
async function gatherRelatedEntities(entity: any, entityType: string, supabaseUrl: string, supabaseKey: string) {
    const related: any = {
        arguments: [],
        objections: [],
        claims: [],
        concepts: []
    };

    // Get objections
    const objResponse = await fetch(`${supabaseUrl}/rest/v1/pis_objections?target_id=eq.${entity.id}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    related.objections = await objResponse.json();

    if (entityType === 'thesis' && entity.related_rpe_id) {
        const rpeResponse = await fetch(`${supabaseUrl}/rest/v1/rpes?id=eq.${entity.related_rpe_id}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const rpe = await rpeResponse.json();
        related.rpe = rpe[0];
    }

    return related;
}

// Helper: Build validation timeline
function buildValidationTimeline(entity: any, provenance: any[], relatedEntities: any) {
    const timeline = [];

    timeline.push({
        timestamp: entity.created_at,
        event: 'Entity created',
        entity_type: entity.constructor.name,
        entity_id: entity.id
    });

    for (const prov of provenance) {
        timeline.push({
            timestamp: prov.generated_at,
            event: `Generated by ${prov.was_attributed_to}`,
            provenance_id: prov.id
        });
    }

    for (const obj of relatedEntities.objections || []) {
        timeline.push({
            timestamp: obj.created_at,
            event: `Objection raised: ${obj.attack_type}`,
            objection_id: obj.id
        });
    }

    return timeline.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
}

// Helper: Generate trace summary
function generateTraceSummary(entity: any, provenance: any[], timeline: any[]) {
    return {
        total_events: timeline.length,
        provenance_depth: provenance.length,
        creation_date: entity.created_at,
        latest_activity: timeline[timeline.length - 1]?.timestamp || entity.created_at,
        validation_path: provenance.map(p => p.was_attributed_to).join(' → ')
    };
}
