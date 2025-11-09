-- Migration: create_request_status_history_and_functions
-- Created at: 1762692053

-- Create request_status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS request_status_history (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  comment TEXT NOT NULL CHECK (length(comment) >= 10),
  changed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_request_status_history_request_id ON request_status_history(request_id);
CREATE INDEX IF NOT EXISTS idx_request_status_history_created_at ON request_status_history(created_at);

-- Create function to generate auto request numbers
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  month_part TEXT;
  sequence_part TEXT;
  next_sequence INTEGER;
  final_number TEXT;
BEGIN
  -- Get current year and month
  year_part := EXTRACT(year FROM CURRENT_DATE)::TEXT;
  month_part := LPAD(EXTRACT(month FROM CURRENT_DATE)::TEXT, 2, '0');
  
  -- Get next sequence number for current month
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number, 7) AS INTEGER)), 0) + 1
  INTO next_sequence
  FROM tickets
  WHERE request_number IS NOT NULL
    AND SUBSTRING(request_number, 1, 4) = year_part
    AND SUBSTRING(request_number, 5, 2) = month_part;
  
  -- Format sequence with leading zeros
  sequence_part := LPAD(next_sequence::TEXT, 4, '0');
  
  -- Create final request number: YYYYMM####
  final_number := year_part || month_part || sequence_part;
  
  RETURN final_number;
END;
$$ LANGUAGE plpgsql;;