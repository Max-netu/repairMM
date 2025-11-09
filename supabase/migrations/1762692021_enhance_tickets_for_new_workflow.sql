-- Migration: enhance_tickets_for_new_workflow
-- Created at: 1762692021

-- Add missing fields to tickets table for the new workflow
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS game_name VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS can_play VARCHAR(2) CHECK (can_play IN ('da', 'ne'));
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS request_number VARCHAR(20) UNIQUE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS comments TEXT;

-- Update existing tickets to have a default status that matches our new workflow
UPDATE tickets SET status = 'novo' WHERE status NOT IN ('u_tijeku', 'čeka se rezervni dio', 'čeka se porezna', 'zatvoreno');

-- Ensure the new workflow status constraints
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status IN ('novo', 'u_tijeku', 'čeka se rezervni dio', 'čeka se porezna', 'zatvoreno'));