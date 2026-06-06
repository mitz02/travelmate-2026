-- Migration: Add vehicle info and amenities columns to rides table
-- Run this in the Supabase SQL Editor

ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS vehicle_make   TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model  TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color  TEXT,
  ADD COLUMN IF NOT EXISTS amenities      JSONB DEFAULT '{}'::jsonb;

-- Optional: add an index on amenities for future filtering
CREATE INDEX IF NOT EXISTS idx_rides_amenities ON rides USING gin (amenities);
