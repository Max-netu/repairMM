-- Migration: remove_priority_field
-- Created at: 1762800000
-- Remove priority field from tickets table as it's not needed

-- Drop the priority constraint first
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_priority_check;

-- Remove the priority column
ALTER TABLE tickets DROP COLUMN IF EXISTS priority;

-- Add comment about the removal
COMMENT ON COLUMN tickets.priority IS 'Priority field removed - not needed in current workflow';