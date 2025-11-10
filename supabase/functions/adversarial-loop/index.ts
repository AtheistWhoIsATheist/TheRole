// Adversarial Loop - Complete validation cycle: Steelman → Red-team → Formalize → Countermodels → Repairs

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
        const { thesis_id, max_iterations = 3 } = await req.json();
        const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

        // Get thesis
        const thesisResponse = await fetch(`${supabaseUrl}/rest/v1/pis_theses?id=eq.${thesis_id}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const thesis = (await thesisResponse.json())[0];

        if (!thesis) {
            throw new Error('Thesis not found');
        }

        // Create Run record
        const runResponse = await fetch(`${supabaseUrl}/rest/v1/pis_runs`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                experiment_type: 'adversarial_loop',
                input_parameters: { thesis_id, max_iterations },
                status: 'running'
            })
        });
        const run = (await runResponse.json())[0];

        const iterations = [];
        let currentStatement = thesis.statement;
        let converged = false;

        for (let i = 0; i < max_iterations && !converged; i++) {
            const iteration: any = {
                iteration_number: i + 1,
                timestamp: new Date().toISOString()
            };

            // Step 1: Steelman - Strengthen the argument
            iteration.steelman = await steelmanAnalysis(currentStatement);

            // Step 2: Red-team - Generate challenges
            iteration.red_team = await redTeamChallenge(iteration.steelman.strengthened);

            // Step 3: Formalize - Convert to formal logic
            iteration.formalization = await formalizeStatement(iteration.steelman.strengthened);

            // Step 4: Countermodels - Find counterexamples
            iteration.countermodels = await generateCountermodels(iteration.formalization);

            // Step 5: Repairs - Propose fixes
            iteration.repairs = await generateRepairs(
                iteration.steelman.strengthened,
                iteration.red_team.challenges,
                iteration.countermodels
            );

            // Store iteration results
            iterations.push(iteration);

            // Check for convergence
            if (iteration.countermodels.length === 0 || iteration.repairs.length === 0) {
                converged = true;
                iteration.convergence = 'Achieved - no significant issues remaining';
            } else if (i > 0 && iterations[i - 1].repairs.length === iteration.repairs.length) {
                converged = true;
                iteration.convergence = 'Stagnated - repairs not reducing issues';
            }

            // Update statement for next iteration if repairs suggested
            if (!converged && iteration.repairs.length > 0) {
                currentStatement = iteration.repairs[0].repaired_statement;
            }
        }

        // Calculate final assessment
        const finalAssessment = {
            converged,
            iterations_count: iterations.length,
            final_statement: currentStatement,
            remaining_issues: iterations[iterations.length - 1].countermodels.length,
            strength_improvement: calculateStrengthImprovement(thesis.statement, currentStatement)
        };

        // Update run with results
        await fetch(`${supabaseUrl}/rest/v1/pis_runs?id=eq.${run.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'completed',
                completed_at: new Date().toISOString(),
                results: {
                    iterations,
                    final_assessment
                }
            })
        });

        // Create provenance for adversarial loop
        await fetch(`${supabaseUrl}/rest/v1/pis_provenance`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                entity_type: 'run',
                entity_id: run.id,
                was_generated_by: thesis_id,
                was_attributed_to: 'adversarial-loop-pipeline',
                metadata: {
                    iterations_count: iterations.length,
                    converged
                }
            })
        });

        return new Response(JSON.stringify({
            success: true,
            run_id: run.id,
            iterations,
            final_assessment
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Adversarial Loop Error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Steelman: Generate strongest version of argument
async function steelmanAnalysis(statement: string) {
    const improvements = [];

    // Add explicit reasoning if missing
    if (!/\b(because|since|therefore|thus|hence)\b/i.test(statement)) {
        improvements.push('Add explicit reasoning connectives');
    }

    // Strengthen weak modifiers
    const weakened = statement.replace(/\b(might|may|could|possibly)\b/gi, 'can');
    if (weakened !== statement) {
        improvements.push('Strengthen modal verbs');
    }

    // Add scope qualifications
    const strengthened = enhanceWithQualifications(statement);

    return {
        original: statement,
        strengthened,
        improvements,
        strength_score: calculateArgumentStrength(strengthened)
    };
}

// Red-team: Generate counterarguments and challenges
async function redTeamChallenge(statement: string) {
    const challenges = [];

    // Scope challenges
    if (/\b(all|every|always|never)\b/i.test(statement)) {
        challenges.push({
            type: 'scope_challenge',
            challenge: 'Overgeneralization: Universal claim needs scope restriction',
            severity: 'high'
        });
    }

    // Evidence challenges
    if (!/\b(evidence|data|research|study|example)\b/i.test(statement)) {
        challenges.push({
            type: 'evidence_challenge',
            challenge: 'Lacks empirical support or concrete examples',
            severity: 'medium'
        });
    }

    // Assumption challenges
    const assumptions = extractAssumptions(statement);
    for (const assumption of assumptions) {
        challenges.push({
            type: 'assumption_challenge',
            challenge: `Hidden assumption: "${assumption}" needs justification`,
            severity: 'medium'
        });
    }

    // Alternative explanation challenges
    if (/\b(cause|lead|result)\b/i.test(statement)) {
        challenges.push({
            type: 'alternative_explanation',
            challenge: 'Alternative causal pathways not considered',
            severity: 'medium'
        });
    }

    // Consistency challenges
    const contradictions = findPotentialContradictions(statement);
    for (const contradiction of contradictions) {
        challenges.push({
            type: 'consistency_challenge',
            challenge: `Potential inconsistency: ${contradiction}`,
            severity: 'high'
        });
    }

    return {
        challenges,
        total_challenges: challenges.length,
        high_severity_count: challenges.filter(c => c.severity === 'high').length
    };
}

// Formalize: Convert natural language to formal logic
async function formalizeStatement(statement: string) {
    const formalizations = [];

    // Extract propositions
    const sentences = statement.split(/[.;]/).filter(s => s.trim().length > 10);

    for (const sentence of sentences) {
        const trimmed = sentence.trim();

        // Try pattern matching for common logical forms
        const patterns = [
            { regex: /\bif (.+) then (.+)/i, template: (m: RegExpMatchArray) => `${m[1]} → ${m[2]}` },
            { regex: /\ball (.+) are (.+)/i, template: (m: RegExpMatchArray) => `∀x(${m[1]}(x) → ${m[2]}(x))` },
            { regex: /\bthere exists? (.+)/i, template: (m: RegExpMatchArray) => `∃x(${m[1]}(x))` },
            { regex: /(.+) and (.+)/i, template: (m: RegExpMatchArray) => `(${m[1]}) ∧ (${m[2]})` },
            { regex: /(.+) or (.+)/i, template: (m: RegExpMatchArray) => `(${m[1]}) ∨ (${m[2]})` },
            { regex: /\bnot (.+)/i, template: (m: RegExpMatchArray) => `¬(${m[1]})` },
            { regex: /(.+) implies (.+)/i, template: (m: RegExpMatchArray) => `${m[1]} → ${m[2]}` }
        ];

        let formalized = null;
        for (const pattern of patterns) {
            const match = trimmed.match(pattern.regex);
            if (match) {
                formalized = {
                    natural_language: trimmed,
                    formal_logic: pattern.template(match),
                    pattern_type: pattern.regex.source
                };
                break;
            }
        }

        if (formalized) {
            formalizations.push(formalized);
        } else {
            // Fallback: Propositional form
            formalizations.push({
                natural_language: trimmed,
                formal_logic: `P(${trimmed.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')})`,
                pattern_type: 'propositional'
            });
        }
    }

    return {
        formalizations,
        success_rate: formalizations.filter(f => f.pattern_type !== 'propositional').length / formalizations.length,
        total_propositions: formalizations.length
    };
}

// Generate countermodels
async function generateCountermodels(formalization: any) {
    const countermodels = [];

    for (const form of formalization.formalizations) {
        const logic = form.formal_logic;

        // Universal statements can be countered with existential negations
        if (logic.includes('∀')) {
            countermodels.push({
                target: form.natural_language,
                countermodel: 'Existential counterexample domain where universal claim fails',
                logic_form: logic.replace('∀', '∃¬')
            });
        }

        // Implications can be countered with true antecedent and false consequent
        if (logic.includes('→')) {
            const parts = logic.split('→');
            countermodels.push({
                target: form.natural_language,
                countermodel: 'Model where antecedent holds but consequent fails',
                logic_form: `${parts[0]} ∧ ¬(${parts[1]})`
            });
        }

        // Conjunctions can be countered by negating either conjunct
        if (logic.includes('∧')) {
            const parts = logic.split('∧');
            countermodels.push({
                target: form.natural_language,
                countermodel: 'Model where at least one conjunct is false',
                logic_form: `¬(${parts[0]}) ∨ ¬(${parts[1]})`
            });
        }
    }

    return countermodels;
}

// Generate repairs
async function generateRepairs(statement: string, challenges: any[], countermodels: any[]) {
    const repairs = [];

    // Address scope challenges
    const scopeChallenges = challenges.filter(c => c.type === 'scope_challenge');
    if (scopeChallenges.length > 0) {
        repairs.push({
            issue: 'Overgeneralization',
            repair_type: 'scope_restriction',
            repaired_statement: addScopeQualifiers(statement),
            confidence: 0.8
        });
    }

    // Address evidence challenges
    const evidenceChallenges = challenges.filter(c => c.type === 'evidence_challenge');
    if (evidenceChallenges.length > 0) {
        repairs.push({
            issue: 'Lacks evidence',
            repair_type: 'evidence_addition',
            repaired_statement: `${statement} This is supported by empirical observations and theoretical frameworks.`,
            confidence: 0.6
        });
    }

    // Address assumption challenges
    const assumptionChallenges = challenges.filter(c => c.type === 'assumption_challenge');
    for (const ac of assumptionChallenges.slice(0, 2)) {
        repairs.push({
            issue: ac.challenge,
            repair_type: 'assumption_explicit',
            repaired_statement: `Assuming ${ac.challenge.split('"')[1]}, ${statement}`,
            confidence: 0.7
        });
    }

    // Address countermodels
    if (countermodels.length > 0) {
        repairs.push({
            issue: 'Countermodels exist',
            repair_type: 'constraint_addition',
            repaired_statement: addConstraints(statement, countermodels),
            confidence: 0.75
        });
    }

    return repairs;
}

// Helper: Enhance with qualifications
function enhanceWithQualifications(statement: string): string {
    let enhanced = statement;

    // Add domain qualifications if missing
    if (!/\b(in|within|under|given)\b/i.test(statement)) {
        enhanced = `Within the nihiltheistic framework, ${enhanced}`;
    }

    // Strengthen weak phrases
    enhanced = enhanced.replace(/\bmight be\b/gi, 'is likely to be');
    enhanced = enhanced.replace(/\bcould be\b/gi, 'can be');
    enhanced = enhanced.replace(/\bpossibly\b/gi, 'plausibly');

    return enhanced;
}

// Helper: Calculate argument strength
function calculateArgumentStrength(statement: string): number {
    let strength = 0.5;

    // Has reasoning connectives
    if (/\b(because|since|therefore|thus|hence)\b/i.test(statement)) {
        strength += 0.1;
    }

    // Has evidence markers
    if (/\b(evidence|data|research|study)\b/i.test(statement)) {
        strength += 0.15;
    }

    // Has explicit scope
    if (/\b(in|within|under|given)\b/i.test(statement)) {
        strength += 0.1;
    }

    // Avoids weak modifiers
    if (!/\b(might|may|possibly|perhaps)\b/i.test(statement)) {
        strength += 0.1;
    }

    // Has structure (multiple sentences)
    if (statement.split(/[.;]/).length > 2) {
        strength += 0.15;
    }

    return Math.min(strength, 1.0);
}

// Helper: Extract assumptions
function extractAssumptions(statement: string): string[] {
    const assumptions = [];
    const normalized = statement.toLowerCase();

    // Implicit causation
    if (/\bwhen .+ then\b/i.test(statement)) {
        assumptions.push('Temporal sequence implies causation');
    }

    // Implicit universality
    if (!/\b(some|many|most|few)\b/i.test(normalized) && /\b(is|are)\b/.test(normalized)) {
        assumptions.push('Statement assumes universal application');
    }

    // Implicit value judgment
    if (/\b(should|must|ought|better|worse)\b/i.test(normalized)) {
        assumptions.push('Normative framework assumed');
    }

    return assumptions;
}

// Helper: Find potential contradictions
function findPotentialContradictions(statement: string): string[] {
    const contradictions = [];
    const normalized = statement.toLowerCase();

    // Self-referential issues
    if (/\ball statements are\b/i.test(normalized)) {
        contradictions.push('Self-referential paradox potential');
    }

    // Opposing terms in same context
    const opposingPairs = [
        ['finite', 'infinite'],
        ['necessary', 'contingent'],
        ['absolute', 'relative']
    ];

    for (const [term1, term2] of opposingPairs) {
        if (normalized.includes(term1) && normalized.includes(term2)) {
            contradictions.push(`Opposing concepts: ${term1} vs ${term2}`);
        }
    }

    return contradictions;
}

// Helper: Add scope qualifiers
function addScopeQualifiers(statement: string): string {
    // Replace universal quantifiers with restricted versions
    let restricted = statement.replace(/\ball\b/gi, 'most');
    restricted = restricted.replace(/\bevery\b/gi, 'nearly all');
    restricted = restricted.replace(/\balways\b/gi, 'typically');
    restricted = restricted.replace(/\bnever\b/gi, 'rarely');

    return restricted;
}

// Helper: Add constraints to address countermodels
function addConstraints(statement: string, countermodels: any[]): string {
    const constraints = ['under standard conditions', 'in typical cases', 'generally speaking'];
    const randomConstraint = constraints[Math.floor(Math.random() * constraints.length)];
    
    return `${randomConstraint}, ${statement}`;
}

// Helper: Calculate strength improvement
function calculateStrengthImprovement(original: string, final: string): number {
    const originalStrength = calculateArgumentStrength(original);
    const finalStrength = calculateArgumentStrength(final);
    
    return finalStrength - originalStrength;
}
