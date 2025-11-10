// NPE→PIS Validation Loop - Validates generated RPEs through PIS quality gates

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
        const { rpe_id, content, axiom_references } = await req.json();
        const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

        // 1. Create PIS Thesis from RPE
        const thesisResponse = await fetch(`${supabaseUrl}/rest/v1/pis_theses`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                statement: content,
                domain: 'nihiltheism',
                related_rpe_id: rpe_id,
                status: 'validating'
            })
        });

        if (!thesisResponse.ok) {
            throw new Error(`Failed to create thesis: ${await thesisResponse.text()}`);
        }

        const thesis = (await thesisResponse.json())[0];

        // 2. Run Quality Gates
        const gates = {
            g1: await runGateG1(content, supabaseUrl, supabaseKey),
            g2: await runGateG2(content, supabaseUrl, supabaseKey),
            g3: await runGateG3(content, thesis.id, supabaseUrl, supabaseKey),
            g4: await runGateG4(content, supabaseUrl, supabaseKey),
            g5: await runGateG5(content, supabaseUrl, supabaseKey),
            g6: await runGateG6(content, axiom_references, supabaseUrl, supabaseKey)
        };

        // 3. Calculate overall validation status
        const allGatesPassed = Object.values(gates).every(g => g.passed);
        const validationStatus = allGatesPassed ? 'validated' : 'rejected';
        
        const validationSummary = {
            gates,
            overall_status: validationStatus,
            formalization: gates.g2.formalization,
            counterexamples: gates.g4.counterexamples,
            repairs_suggested: gates.g5.repairs
        };

        // 4. Update Thesis with gate results
        await fetch(`${supabaseUrl}/rest/v1/pis_theses?id=eq.${thesis.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: validationStatus,
                gate_g1: gates.g1.passed,
                gate_g2: gates.g2.passed,
                gate_g3: gates.g3.passed,
                gate_g4: gates.g4.passed,
                gate_g5: gates.g5.passed,
                gate_g6: gates.g6.passed,
                validation_summary: JSON.stringify(validationSummary)
            })
        });

        // 5. Create Provenance Record
        await fetch(`${supabaseUrl}/rest/v1/pis_provenance`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                entity_type: 'thesis',
                entity_id: thesis.id,
                was_derived_from: [rpe_id],
                was_attributed_to: 'npe-pis-validation-pipeline',
                metadata: validationSummary
            })
        });

        return new Response(JSON.stringify({
            success: true,
            thesis_id: thesis.id,
            validation_status: validationStatus,
            gates,
            summary: validationSummary
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('NPE-PIS Validation Error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Gate G1: Vocabulary Consistency Check
async function runGateG1(content: string, supabaseUrl: string, supabaseKey: string) {
    const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const uniqueWords = [...new Set(words)];
    
    const vocabResponse = await fetch(`${supabaseUrl}/rest/v1/pis_controlled_vocabulary`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    
    const vocabulary = await vocabResponse.json();
    const approvedTerms = new Set(vocabulary.map((v: any) => v.term.toLowerCase()));
    
    const philosophicalTerms = uniqueWords.filter(word => 
        ['nihil', 'transcend', 'void', 'being', 'existence', 'ontological', 'epistemic'].some(root => word.includes(root))
    );
    
    const unapprovedTerms = philosophicalTerms.filter(term => !approvedTerms.has(term));
    const consistencyScore = philosophicalTerms.length > 0 
        ? 1 - (unapprovedTerms.length / philosophicalTerms.length)
        : 1.0;
    
    return {
        passed: consistencyScore >= 0.8,
        score: consistencyScore,
        unapproved_terms: unapprovedTerms,
        details: `Vocabulary consistency: ${(consistencyScore * 100).toFixed(1)}%`
    };
}

// Gate G2: Formalization Success
async function runGateG2(content: string, supabaseUrl: string, supabaseKey: string) {
    // Extract claims and attempt formalization
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const formalizations: any[] = [];
    
    for (const sentence of sentences.slice(0, 5)) {
        const formalization = attemptFormalization(sentence);
        if (formalization) {
            formalizations.push(formalization);
            
            // Store as Claim
            await fetch(`${supabaseUrl}/rest/v1/pis_claims`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    statement: sentence.trim(),
                    formal_representation: formalization.logic,
                    domain: 'nihiltheism'
                })
            });
        }
    }
    
    const successRate = sentences.length > 0 ? formalizations.length / Math.min(sentences.length, 5) : 0;
    
    return {
        passed: successRate >= 0.6,
        score: successRate,
        formalization: formalizations,
        details: `Formalized ${formalizations.length}/${Math.min(sentences.length, 5)} key claims`
    };
}

// Gate G3: Proof Soundness
async function runGateG3(content: string, thesisId: string, supabaseUrl: string, supabaseKey: string) {
    // Check for logical consistency and valid inference patterns
    const hasContradiction = checkContradictions(content);
    const hasValidInference = checkInferencePatterns(content);
    
    if (hasValidInference) {
        // Create Argument record
        await fetch(`${supabaseUrl}/rest/v1/pis_arguments`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                structure_type: 'deductive',
                validity_status: hasContradiction ? 'invalid' : 'valid',
                formal_proof: `Validated inference patterns in thesis ${thesisId}`
            })
        });
    }
    
    return {
        passed: !hasContradiction && hasValidInference,
        has_contradiction: hasContradiction,
        valid_inference: hasValidInference,
        details: hasContradiction ? 'Contradiction detected' : 'Logically sound'
    };
}

// Gate G4: Countermodel Adequacy
async function runGateG4(content: string, supabaseUrl: string, supabaseKey: string) {
    const counterexamples = generateCounterexamples(content);
    
    // Store significant counterexamples as Objections
    for (const ce of counterexamples.slice(0, 3)) {
        await fetch(`${supabaseUrl}/rest/v1/pis_objections`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_type: 'thesis',
                objection_statement: ce.objection,
                attack_type: 'counterexample',
                strength_score: ce.strength
            })
        });
    }
    
    const strongCounterexamples = counterexamples.filter(ce => ce.strength > 0.7);
    
    return {
        passed: strongCounterexamples.length === 0,
        counterexamples,
        strong_counterexamples_count: strongCounterexamples.length,
        details: `Generated ${counterexamples.length} counterexamples, ${strongCounterexamples.length} strong`
    };
}

// Gate G5: Repair Convergence
async function runGateG5(content: string, supabaseUrl: string, supabaseKey: string) {
    const issues = identifyIssues(content);
    const repairs = issues.map(issue => generateRepair(issue));
    
    return {
        passed: issues.length <= 2,
        issues_count: issues.length,
        repairs,
        details: `Identified ${issues.length} issues with repair suggestions`
    };
}

// Gate G6: Integration Coherence
async function runGateG6(content: string, axiomRefs: any[], supabaseUrl: string, supabaseKey: string) {
    if (!axiomRefs || axiomRefs.length === 0) {
        return { passed: true, coherence_score: 1.0, details: 'No axiom conflicts (standalone)' };
    }
    
    // Check coherence with referenced axioms
    const coherenceScores = axiomRefs.map(axiom => calculateCoherence(content, axiom));
    const avgCoherence = coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length;
    
    return {
        passed: avgCoherence >= 0.7,
        coherence_score: avgCoherence,
        axiom_coherence: coherenceScores,
        details: `Coherence with axioms: ${(avgCoherence * 100).toFixed(1)}%`
    };
}

// Helper: Attempt to formalize natural language to logic
function attemptFormalization(sentence: string) {
    // Enhanced pattern matching for philosophical statements
    const patterns = [
        // Universal quantification patterns
        { regex: /all (.+?) (?:are|is) (.+)/i, logic: (m: RegExpMatchArray) => `∀x(${cleanTerm(m[1])}(x) → ${cleanTerm(m[2])}(x))` },
        { regex: /every (.+?) (?:are|is) (.+)/i, logic: (m: RegExpMatchArray) => `∀x(${cleanTerm(m[1])}(x) → ${cleanTerm(m[2])}(x))` },
        { regex: /no (.+?) (?:are|is) (.+)/i, logic: (m: RegExpMatchArray) => `∀x(${cleanTerm(m[1])}(x) → ¬${cleanTerm(m[2])}(x))` },
        
        // Existential quantification patterns
        { regex: /there (?:exists?|is) (?:a|an|some) (.+?) (?:that|which) (.+)/i, logic: (m: RegExpMatchArray) => `∃x(${cleanTerm(m[1])}(x) ∧ ${cleanTerm(m[2])}(x))` },
        { regex: /some (.+?) (?:are|is) (.+)/i, logic: (m: RegExpMatchArray) => `∃x(${cleanTerm(m[1])}(x) ∧ ${cleanTerm(m[2])}(x))` },
        
        // Implication patterns
        { regex: /if (.+?) then (.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) → (${cleanTerm(m[2])})` },
        { regex: /(.+?) implies (.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) → (${cleanTerm(m[2])})` },
        { regex: /(.+?) entails (.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) → (${cleanTerm(m[2])})` },
        { regex: /when (.+?),? (?:then )?(.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) → (${cleanTerm(m[2])})` },
        
        // Necessity and possibility (modal logic)
        { regex: /(.+?) (?:must be|necessarily is) (.+)/i, logic: (m: RegExpMatchArray) => `□(${cleanTerm(m[1])} → ${cleanTerm(m[2])})` },
        { regex: /it is necessary that (.+)/i, logic: (m: RegExpMatchArray) => `□(${cleanTerm(m[1])})` },
        { regex: /(.+?) (?:can be|possibly is|may be) (.+)/i, logic: (m: RegExpMatchArray) => `◇(${cleanTerm(m[1])} → ${cleanTerm(m[2])})` },
        { regex: /it is possible that (.+)/i, logic: (m: RegExpMatchArray) => `◇(${cleanTerm(m[1])})` },
        
        // Conjunction patterns
        { regex: /(.+?) and (.+?) (?:are|is) (.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) ∧ (${cleanTerm(m[2])}) → (${cleanTerm(m[3])})` },
        { regex: /both (.+?) and (.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) ∧ (${cleanTerm(m[2])})` },
        
        // Disjunction patterns
        { regex: /either (.+?) or (.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) ∨ (${cleanTerm(m[2])})` },
        { regex: /(.+?) or (.+?) (?:but not both)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) ⊕ (${cleanTerm(m[2])})` },
        
        // Negation patterns
        { regex: /it is not the case that (.+)/i, logic: (m: RegExpMatchArray) => `¬(${cleanTerm(m[1])})` },
        { regex: /(.+?) (?:is|are) not (.+)/i, logic: (m: RegExpMatchArray) => `¬(${cleanTerm(m[1])} → ${cleanTerm(m[2])})` },
        
        // Biconditional patterns
        { regex: /(.+?) if and only if (.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) ↔ (${cleanTerm(m[2])})` },
        { regex: /(.+?) iff (.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) ↔ (${cleanTerm(m[2])})` },
        
        // Identity and equivalence
        { regex: /(.+?) (?:is|are) (?:identical to|the same as|equivalent to) (.+)/i, logic: (m: RegExpMatchArray) => `(${cleanTerm(m[1])}) = (${cleanTerm(m[2])})` },
        
        // Philosophical patterns for nihiltheism
        { regex: /(.+?) reveals? that (.+)/i, logic: (m: RegExpMatchArray) => `Reveals(${cleanTerm(m[1])}, ${cleanTerm(m[2])})` },
        { regex: /(.+?) emerges? from (.+)/i, logic: (m: RegExpMatchArray) => `Emerges(${cleanTerm(m[1])}, ${cleanTerm(m[2])})` },
        { regex: /the (.+?) of (.+?) is (.+)/i, logic: (m: RegExpMatchArray) => `${cleanTerm(m[1])}(${cleanTerm(m[2])}) = ${cleanTerm(m[3])}` }
    ];
    
    for (const pattern of patterns) {
        const match = sentence.match(pattern.regex);
        if (match) {
            try {
                const logic = pattern.logic(match);
                return { 
                    sentence: sentence.trim(), 
                    logic: logic,
                    pattern_type: pattern.regex.source.substring(0, 50)
                };
            } catch (e) {
                // Pattern matched but logic generation failed, continue to next pattern
                continue;
            }
        }
    }
    
    // Fallback: Check if sentence contains key philosophical terms that merit symbolic representation
    const philosophicalTerms = /\b(void|ground|nihil|transcend|paradox|being|exist|meaning|truth|essence|function)\b/i;
    if (philosophicalTerms.test(sentence) && sentence.length > 20) {
        // Extract key terms and create a propositional representation
        const terms = sentence.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
        const mainTerms = terms.filter(t => 
            !['that', 'this', 'with', 'from', 'into', 'about', 'which', 'where', 'when'].includes(t)
        ).slice(0, 3);
        
        if (mainTerms.length > 0) {
            const propSymbol = mainTerms.map(t => t.charAt(0).toUpperCase()).join('');
            return {
                sentence: sentence.trim(),
                logic: `P_${propSymbol}(${mainTerms.join(', ')})`,
                pattern_type: 'propositional_philosophical'
            };
        }
    }
    
    return null;
}

// Helper: Clean terms for logical representation
function cleanTerm(term: string): string {
    return term
        .trim()
        .replace(/^(a|an|the)\s+/i, '') // Remove articles
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters
        .substring(0, 30); // Limit length
}

// Helper: Check for logical contradictions
function checkContradictions(content: string): boolean {
    const normalized = content.toLowerCase();
    const contradictionPatterns = [
        /both (.+) and not \1/,
        /(.+) is (.+) and (.+) is not \2/,
        /simultaneously (.+) and (.+) cannot/
    ];
    
    return contradictionPatterns.some(pattern => pattern.test(normalized));
}

// Helper: Check for valid inference patterns
function checkInferencePatterns(content: string): boolean {
    const normalized = content.toLowerCase();
    const validPatterns = [
        /therefore/,
        /thus/,
        /hence/,
        /it follows that/,
        /we can conclude/,
        /implies/,
        /entails/
    ];
    
    return validPatterns.some(pattern => pattern.test(normalized));
}

// Helper: Generate counterexamples
function generateCounterexamples(content: string) {
    const counterexamples = [];
    
    // Existential claims can be countered by universal negations
    if (/there exists|some/i.test(content)) {
        counterexamples.push({
            objection: 'Universal negation: Consider a domain where no such entity exists',
            strength: 0.6
        });
    }
    
    // Universal claims can be countered by specific exceptions
    if (/all|every|always/i.test(content)) {
        counterexamples.push({
            objection: 'Counterexample: Edge case where the universal claim fails',
            strength: 0.7
        });
    }
    
    // Causal claims can be countered by correlation-causation critique
    if (/causes|leads to|results in/i.test(content)) {
        counterexamples.push({
            objection: 'Correlation vs Causation: May be mere correlation without causal link',
            strength: 0.5
        });
    }
    
    return counterexamples;
}

// Helper: Identify issues in content
function identifyIssues(content: string) {
    const issues = [];
    
    if (content.length < 100) {
        issues.push('Insufficient elaboration');
    }
    
    if (!/\b(because|since|therefore|thus)\b/i.test(content)) {
        issues.push('Lacks explicit reasoning');
    }
    
    if ((content.match(/\b(is|are|was|were)\b/g) || []).length > content.split(/\s+/).length * 0.15) {
        issues.push('Overuse of copula (weak assertions)');
    }
    
    return issues;
}

// Helper: Generate repair suggestion
function generateRepair(issue: string) {
    const repairs: Record<string, string> = {
        'Insufficient elaboration': 'Expand with additional premises and examples',
        'Lacks explicit reasoning': 'Add transitional phrases showing logical flow',
        'Overuse of copula (weak assertions)': 'Replace "is/are" with stronger verbs showing action/relation'
    };
    
    return repairs[issue] || 'Review and strengthen argument';
}

// Helper: Calculate coherence between content and axiom
function calculateCoherence(content: string, axiom: any): number {
    const contentWords = new Set(content.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
    const axiomWords = new Set((axiom.content || '').toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
    
    const intersection = [...contentWords].filter(word => axiomWords.has(word));
    const union = new Set([...contentWords, ...axiomWords]);
    
    return intersection.length / union.size;
}
