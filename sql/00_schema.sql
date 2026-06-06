-- ════════════════════════════════════════════════════════════════════════════════
-- TravelMate — Complete Database Schema
-- 
-- Run this FIRST in your Supabase SQL Editor before any other migration files.
-- This creates all core foundation tables the application depends on.
--
-- Order of execution:
--   1. 00_schema.sql          ← THIS FILE (core tables)
--   2. 01_admin_setup.sql     (adds admin columns to profiles)
--   3. 02_app_settings.sql    (dynamic config/settings table)
--   4. 03_geospatial.sql      (search functions)
--   5. 04_chat.sql            (conversations & messages + RLS)
-- ════════════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES  (users — riders, drivers, admins)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Auth / credentials
  email           TEXT        NOT NULL UNIQUE,
  password_hash   TEXT,
  phone           TEXT        UNIQUE,
  phone_verified  BOOLEAN     DEFAULT FALSE,
  email_verified  BOOLEAN     DEFAULT FALSE,

  -- Personal info
  first_name      TEXT,
  last_name       TEXT,
  surname         TEXT,
  date_of_birth   TEXT,                          -- stored as MM/DD/YYYY string
  gender          TEXT        CHECK (gender IN ('male', 'female', 'other')),
  profile_picture TEXT,                          -- URL to uploaded image

  -- Role & status
  role            TEXT        NOT NULL DEFAULT 'rider'
                              CHECK (role IN ('rider', 'driver', 'admin')),
  is_admin        BOOLEAN     DEFAULT FALSE,
  account_status  TEXT        DEFAULT 'active'
                              CHECK (account_status IN ('active', 'suspended', 'banned')),

  -- KYC
  kyc_status      TEXT        DEFAULT 'unverified'
                              CHECK (kyc_status IN ('unverified', 'pending', 'approved', 'verified', 'rejected')),
  kyc_data        JSONB       DEFAULT '{}'::jsonb,

  -- Address & preferences (JSONB for flexible schema)
  address         JSONB       DEFAULT '{}'::jsonb,
  preferences     JSONB       DEFAULT '{}'::jsonb,

  -- Ratings
  ratings         NUMERIC     DEFAULT 0,

  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email    ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone    ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role     ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc      ON profiles(kyc_status);


-- ────────────────────────────────────────────────────────────────────────────────
-- 2. WALLETS  (one per user — balance, earnings, held funds)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance         NUMERIC     DEFAULT 0,
  total_earnings  NUMERIC     DEFAULT 0,
  total_withdrawn NUMERIC     DEFAULT 0,
  held_amount     NUMERIC     DEFAULT 0,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);


-- ────────────────────────────────────────────────────────────────────────────────
-- 3. TRANSACTIONS  (all money movements — earnings, withdrawals, refunds, etc.)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL
                              CHECK (type IN ('earning', 'withdrawal', 'refund', 'fee', 'held', 'released', 'payout', 'wallet_funding')),
  amount          NUMERIC     NOT NULL,
  status          TEXT        DEFAULT 'pending'
                              CHECK (status IN ('completed', 'pending', 'failed')),
  description     TEXT,
  related_id      UUID,                          -- optional FK to escrow or booking
  metadata        JSONB       DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status    ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created   ON transactions(created_at DESC);


-- ────────────────────────────────────────────────────────────────────────────────
-- 4. RIDES  (driver-published ride offers)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Route
  "from"          TEXT        NOT NULL,
  "to"            TEXT        NOT NULL,
  from_lat        FLOAT,
  from_lng        FLOAT,
  to_lat          FLOAT,
  to_lng          FLOAT,

  -- Schedule & pricing
  departure_time  TIMESTAMPTZ NOT NULL,
  price_per_seat  NUMERIC     NOT NULL,
  available_seats INT         NOT NULL,
  total_seats     INT         NOT NULL,
  description     TEXT,

  -- Status
  status          TEXT        DEFAULT 'open'
                              CHECK (status IN ('open', 'confirmed', 'in_progress', 'completed', 'cancelled')),

  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rides_driver_id      ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status         ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_departure_time ON rides(departure_time);


-- ────────────────────────────────────────────────────────────────────────────────
-- 5. BOOKINGS  (rider books seats on a ride)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id           UUID        NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rider_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Booking details
  seats_booked      INT         NOT NULL DEFAULT 1,
  total_price       NUMERIC     NOT NULL,
  status            TEXT        DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'confirmed', 'in_progress', 'completed', 'cancelled')),

  -- Payment
  payment_reference TEXT,
  payment_status    TEXT        DEFAULT 'unpaid'
                                CHECK (payment_status IN ('unpaid', 'initiated', 'completed', 'refunded')),
  escrow_id         UUID,                         -- FK to escrows, set after payment

  -- Timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_ride_id   ON bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_rider_id  ON bookings(rider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings(status);


-- ────────────────────────────────────────────────────────────────────────────────
-- 6. ESCROWS  (funds held between payment and ride completion)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrows (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id        UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount            NUMERIC     NOT NULL,
  status            TEXT        DEFAULT 'held'
                                CHECK (status IN ('held', 'released', 'refunded')),
  hold_reason       TEXT,
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  released_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_escrows_booking_id ON escrows(booking_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status     ON escrows(status);

-- Add FK from bookings.escrow_id → escrows.id  (circular reference, added after both exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_bookings_escrow'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT fk_bookings_escrow
      FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────────
-- 7. KYC_SUBMISSIONS  (admin review queue for KYC documents)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          TEXT        DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  submission_data JSONB       DEFAULT '{}'::jsonb,
  reviewer_notes  TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status  ON kyc_submissions(status);


-- ────────────────────────────────────────────────────────────────────────────────
-- 8. APP_SETTINGS  (dynamic admin settings — API keys, config)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key             VARCHAR(255) PRIMARY KEY,
  value           TEXT        NOT NULL,
  is_public       BOOLEAN     DEFAULT FALSE,
  description     TEXT,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial settings rows
INSERT INTO app_settings (key, value, is_public, description) VALUES
  ('MAPBOX_ACCESS_TOKEN',  '', TRUE,  'Public token for Mapbox frontend rendering'),
  ('VTPASS_API_KEY',       '', FALSE, 'VTpass private API key'),
  ('VTPASS_SECRET_KEY',    '', FALSE, 'VTpass secret key'),
  ('VTPASS_PUBLIC_KEY',    '', TRUE,  'VTpass public key'),
  ('PAYSTACK_SECRET_KEY',  '', FALSE, 'Paystack secret key'),
  ('PAYSTACK_PUBLIC_KEY',  '', TRUE,  'Paystack public key')
ON CONFLICT (key) DO NOTHING;


-- ────────────────────────────────────────────────────────────────────────────────
-- 9. CONVERSATIONS  (chat between rider & driver for a ride)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id     UUID        NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rider_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_conversation UNIQUE (ride_id, rider_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_rider_id  ON conversations(rider_id);
CREATE INDEX IF NOT EXISTS idx_conversations_driver_id ON conversations(driver_id);


-- ────────────────────────────────────────────────────────────────────────────────
-- 10. MESSAGES  (individual chat messages)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id  UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT        NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at);


-- ════════════════════════════════════════════════════════════════════════════════
-- GEOSPATIAL SEARCH FUNCTIONS  (Haversine — no PostGIS needed)
-- ════════════════════════════════════════════════════════════════════════════════

-- Distance helper (returns km)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT
) RETURNS FLOAT AS $$
DECLARE
  x FLOAT = 69.1 * (lat2 - lat1);
  y FLOAT = 69.1 * (lon2 - lon1) * cos(lat1 / 57.3);
BEGIN
  RETURN sqrt(x * x + y * y) * 1.60934;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Proximity search RPC
CREATE OR REPLACE FUNCTION search_nearby_rides(
  pickup_lat FLOAT,
  pickup_lng FLOAT,
  pickup_radius_km FLOAT,
  dropoff_lat FLOAT DEFAULT NULL,
  dropoff_lng FLOAT DEFAULT NULL,
  dropoff_radius_km FLOAT DEFAULT NULL,
  limit_count INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  driver_id UUID,
  "from" TEXT,
  "to" TEXT,
  from_lat FLOAT,
  from_lng FLOAT,
  to_lat FLOAT,
  to_lng FLOAT,
  departure_time TIMESTAMPTZ,
  price_per_seat NUMERIC,
  available_seats INT,
  total_seats INT,
  status TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  pickup_distance_km FLOAT,
  dropoff_distance_km FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id, r.driver_id, r."from", r."to",
    r.from_lat, r.from_lng, r.to_lat, r.to_lng,
    r.departure_time, r.price_per_seat, r.available_seats, r.total_seats,
    r.status, r.description, r.created_at,
    calculate_distance(pickup_lat, pickup_lng, r.from_lat, r.from_lng) AS pickup_distance_km,
    CASE
      WHEN dropoff_lat IS NOT NULL AND dropoff_lng IS NOT NULL
      THEN calculate_distance(dropoff_lat, dropoff_lng, r.to_lat, r.to_lng)
      ELSE 0::FLOAT
    END AS dropoff_distance_km
  FROM rides r
  WHERE
    r.status = 'open'
    AND r.available_seats > 0
    AND calculate_distance(pickup_lat, pickup_lng, r.from_lat, r.from_lng) <= pickup_radius_km
    AND (
      dropoff_lat IS NULL
      OR dropoff_lng IS NULL
      OR dropoff_radius_km IS NULL
      OR calculate_distance(dropoff_lat, dropoff_lng, r.to_lat, r.to_lng) <= dropoff_radius_km
    )
  ORDER BY pickup_distance_km ASC, r.departure_time ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;


-- ════════════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY  (for chat tables accessed via Supabase Auth)
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS conversations_select ON conversations;
  DROP POLICY IF EXISTS conversations_insert ON conversations;
  DROP POLICY IF EXISTS messages_select ON messages;
  DROP POLICY IF EXISTS messages_insert ON messages;
END $$;

CREATE POLICY conversations_select ON conversations
  FOR SELECT USING (auth.uid()::text = rider_id::text OR auth.uid()::text = driver_id::text);

CREATE POLICY conversations_insert ON conversations
  FOR INSERT WITH CHECK (auth.uid()::text = rider_id::text);

CREATE POLICY messages_select ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid()::text = c.rider_id::text OR auth.uid()::text = c.driver_id::text)
    )
  );

CREATE POLICY messages_insert ON messages
  FOR INSERT WITH CHECK (
    auth.uid()::text = sender_id::text AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (auth.uid()::text = c.rider_id::text OR auth.uid()::text = c.driver_id::text)
    )
  );


-- ════════════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER  (auto-update updated_at on row changes)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that have updated_at
DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
  CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS trg_rides_updated_at ON rides;
  CREATE TRIGGER trg_rides_updated_at BEFORE UPDATE ON rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
  CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;


-- ════════════════════════════════════════════════════════════════════════════════
-- DONE!  All 10 tables + functions + indexes + triggers created.
-- ════════════════════════════════════════════════════════════════════════════════
