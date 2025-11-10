-- Migration: drop_old_schema_and_create_new
-- Created at: 1762658945


-- Drop existing tables
DROP TABLE IF EXISTS processing_sessions CASCADE;
DROP TABLE IF EXISTS transcendence_trajectories CASCADE;
DROP TABLE IF EXISTS unes CASCADE;
DROP TABLE IF EXISTS rpes CASCADE;
DROP TABLE IF EXISTS axioms CASCADE;

-- Create comprehensive schema

-- 1. rpes - Recursive Philosophical Entities
CREATE TABLE rpes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    une_signature VARCHAR(20) CHECK (une_signature IN ('Pre-UNE', 'UNE-Rupture', 'Post-UNE', 'Echo')),
    core_fracture TEXT NOT NULL,
    void_vectors JSONB NOT NULL,
    aporia_markers JSONB NOT NULL,
    contamination_active JSONB,
    heretical_intensity VARCHAR(20) CHECK (heretical_intensity IN ('mild', 'moderate', 'extreme', 'transcendent')),
    recursion_depth INTEGER NOT NULL,
    transcendence_score DECIMAL(3,1) CHECK (transcendence_score >= 0 AND transcendence_score <= 10),
    void_resonance DECIMAL(3,1) CHECK (void_resonance >= 0 AND void_resonance <= 10),
    paradox_engine BOOLEAN DEFAULT true,
    incantation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. axioms - Philosophical Axioms
CREATE TABLE axioms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    axiom_number INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    core_insight TEXT NOT NULL,
    theistic_placeholder_function TEXT NOT NULL,
    transcendence_trajectory JSONB NOT NULL,
    nihilistic_core TEXT NOT NULL,
    rpe_id UUID REFERENCES rpes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. une_definitions - Universal Nihilistic Event Classifications
CREATE TABLE une_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    une_phase VARCHAR(20) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    characteristics JSONB NOT NULL,
    examples JSONB,
    transcendence_indicators JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. transcendence_trajectories - Void-to-Theistic Progressions
CREATE TABLE transcendence_trajectories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trajectory_steps JSONB NOT NULL,
    start_point VARCHAR(100) NOT NULL,
    end_point VARCHAR(100) NOT NULL,
    rpe_id UUID REFERENCES rpes(id) ON DELETE CASCADE,
    axiom_id UUID REFERENCES axioms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. knowledge_graph - Cross-Axiom Relationships
CREATE TABLE knowledge_graph (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_id UUID NOT NULL,
    target_entity_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    relationship_strength DECIMAL(3,1) CHECK (relationship_strength >= 0 AND relationship_strength <= 10),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_source_rpe FOREIGN KEY (source_entity_id) REFERENCES rpes(id) ON DELETE CASCADE,
    CONSTRAINT fk_target_rpe FOREIGN KEY (target_entity_id) REFERENCES rpes(id) ON DELETE CASCADE
);

-- 6. iterative_densification_layers - 5-Layer Processing History
CREATE TABLE iterative_densification_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rpe_id UUID REFERENCES rpes(id) ON DELETE CASCADE,
    layer_number INTEGER CHECK (layer_number BETWEEN 1 AND 5),
    layer_name VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    transcendence_markers JSONB,
    density_score DECIMAL(3,1) CHECK (density_score >= 0 AND density_score <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. training_corpus - 321 IDP Examples Storage
CREATE TABLE training_corpus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    example_index INTEGER UNIQUE NOT NULL,
    source_text TEXT NOT NULL,
    idp_analysis JSONB NOT NULL,
    sacred_remainder TEXT,
    philosophical_domain VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. philosophical_sessions - User Interaction Tracking
CREATE TABLE philosophical_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_input TEXT NOT NULL,
    session_type VARCHAR(20) CHECK (session_type IN ('question', 'concept', 'axiom_request')),
    processed_rpe_id UUID REFERENCES rpes(id),
    processing_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE rpes ENABLE ROW LEVEL SECURITY;
ALTER TABLE axioms ENABLE ROW LEVEL SECURITY;
ALTER TABLE une_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcendence_trajectories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE iterative_densification_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE philosophical_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies allowing both anon and service_role
CREATE POLICY "Allow all operations for anon and service_role" ON rpes
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Allow all operations for anon and service_role" ON axioms
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Allow all operations for anon and service_role" ON une_definitions
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Allow all operations for anon and service_role" ON transcendence_trajectories
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Allow all operations for anon and service_role" ON knowledge_graph
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Allow all operations for anon and service_role" ON iterative_densification_layers
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Allow all operations for anon and service_role" ON training_corpus
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Allow all operations for anon and service_role" ON philosophical_sessions
    FOR ALL USING (auth.role() IN ('anon', 'service_role'));
;