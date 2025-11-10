-- Migration: add_pis_fields_to_rpes
-- Created at: 1762682126

ALTER TABLE rpes 
ADD COLUMN IF NOT EXISTS pis_validation_status VARCHAR(50) DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS pis_thesis_id UUID,
ADD COLUMN IF NOT EXISTS pis_validation_summary TEXT;;