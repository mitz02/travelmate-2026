-- ════════════════════════════════════════════════════════════════════════════════
-- Schema Alignment: Add missing columns, tables & rename mismatched columns
-- ════════════════════════════════════════════════════════════════════════════════

-- 0. VEHICLES table (missing from 00_schema.sql)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT,
  color TEXT,
  plate TEXT,
  capacity INT DEFAULT 4,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. PROFILES: add missing columns that code expects
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trips_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS earnings_total NUMERIC DEFAULT 0;

-- 3. WALLETS: add status column (missing from 00_schema.sql)
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 4. RIDES: add missing columns
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- 5. BOOKINGS: rename columns and add missing ones
ALTER TABLE public.bookings RENAME COLUMN seats_booked TO seats;
ALTER TABLE public.bookings RENAME COLUMN total_price TO total_amount;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dropoff_confirmed_at TIMESTAMPTZ;

-- 6. NOTIFICATIONS: convert is_read (boolean) → read_at (timestamptz)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
UPDATE public.notifications SET read_at = created_at WHERE is_read = TRUE;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS is_read;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 7. Create the atomic wallet deduction function
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance DECIMAL;
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_status = 'frozen' THEN
    RAISE EXCEPTION 'Wallet is frozen';
  END IF;

  UPDATE public.wallets
  SET balance = balance - p_amount,
      last_updated = NOW()
  WHERE user_id = p_user_id
    AND balance >= p_amount
    AND status != 'frozen'
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or wallet not found';
  END IF;

  RETURN v_new_balance;
END;
$$;
