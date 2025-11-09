-- Migration: update_tickets_status_to_croatian
-- Created at: 1762692033

-- Update existing tickets to use Croatian status values
UPDATE tickets SET status = CASE 
  WHEN status = 'new' THEN 'novo'
  WHEN status = 'in_progress' THEN 'u_tijeku'
  WHEN status = 'waiting_parts' THEN 'čeka se rezervni dio'
  WHEN status = 'closed' THEN 'zatvoreno'
  ELSE status
END;

-- Add missing fields to tickets table for the new workflow
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS game_name VARCHAR(255);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS can_play VARCHAR(2) CHECK (can_play IN ('da', 'ne'));
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS request_number VARCHAR(20) UNIQUE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add status constraint with Croatian values
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status IN ('novo', 'u_tijeku', 'čeka se rezervni dio', 'čeka se porezna', 'zatvoreno'));;