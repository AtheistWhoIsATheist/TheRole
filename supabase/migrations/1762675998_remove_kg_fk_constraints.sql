-- Migration: remove_kg_fk_constraints
-- Created at: 1762675998


-- Remove foreign key constraints to allow RPE-to-Axiom relationships
ALTER TABLE knowledge_graph DROP CONSTRAINT IF EXISTS fk_source_rpe;
ALTER TABLE knowledge_graph DROP CONSTRAINT IF EXISTS fk_target_rpe;

-- Add comments to document the change
COMMENT ON TABLE knowledge_graph IS 'Knowledge graph relationships between any entities (RPEs, Axioms, etc.)';
;