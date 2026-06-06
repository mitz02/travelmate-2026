-- Create saved_plans table for persisting admin-configured plans
CREATE TABLE IF NOT EXISTS saved_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,              -- e.g. 'mtn-data', 'airtime', 'electricity', 'dstv', 'gotv'
  name TEXT NOT NULL,
  variation_code TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  api_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  volume TEXT,
  validity TEXT,
  plan_type TEXT,
  network TEXT,
  mode TEXT,                          -- 'sandbox' or 'live'
  api_type TEXT DEFAULT 'vtpass',     -- 'vtpass' or 'bardetech'
  cashback_type TEXT DEFAULT 'fixed',
  cashback_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups by service
CREATE INDEX IF NOT EXISTS idx_saved_plans_service ON saved_plans(service);

-- Create unique index to prevent duplicate variation_code per service+mode
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_plans_unique 
  ON saved_plans(variation_code, service, COALESCE(mode, ''));

-- Enable RLS (optional, adjust as needed)
ALTER TABLE saved_plans ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON saved_plans
  FOR ALL USING (true) WITH CHECK (true);
