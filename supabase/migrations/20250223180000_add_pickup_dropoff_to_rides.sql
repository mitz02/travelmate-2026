-- Add explicit columns for pickup and dropoff points to the rides table
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS pickup_point TEXT,
ADD COLUMN IF NOT EXISTS dropoff_point TEXT;
