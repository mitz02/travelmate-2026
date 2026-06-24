-- Bookings, Wallets, Transactions, Escrow
-- Depends on: users, rides (from previous migration)

-- 5. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seats_booked INTEGER NOT NULL CHECK (seats_booked > 0),
  total_amount DECIMAL(12,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  driver_payout DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - platform_fee) STORED,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'paid', 'cancelled', 'completed', 'refunded')),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'held', 'completed', 'refunded', 'failed')),
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.users(id),
  cancelled_at TIMESTAMP,
  pickup_point TEXT,
  dropoff_point TEXT,
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_ride_rider_active
  ON public.bookings (ride_id, rider_id)
  WHERE status IN ('pending', 'accepted', 'paid');

CREATE INDEX IF NOT EXISTS idx_bookings_ride ON public.bookings (ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_rider ON public.bookings (rider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings (payment_status);

-- 6. WALLETS TABLE
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0 CHECK (balance >= 0),
  currency VARCHAR(10) DEFAULT 'NGN',
  is_frozen BOOLEAN DEFAULT false,
  freeze_reason TEXT,
  frozen_at TIMESTAMP,
  daily_limit DECIMAL(12,2) DEFAULT 100000,
  monthly_limit DECIMAL(12,2) DEFAULT 1000000,
  last_transaction_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_balance ON public.wallets (balance);

-- 7. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'deposit', 'withdrawal', 'payment', 'refund',
    'fee', 'transfer_in', 'transfer_out',
    'airtime', 'data', 'electricity', 'escrow_hold', 'escrow_release'
  )),
  amount DECIMAL(12,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - fee) STORED,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  reference VARCHAR(255) UNIQUE,
  provider_reference VARCHAR(255),
  provider_response JSONB,
  metadata JSONB,
  description TEXT,
  booking_id UUID REFERENCES public.bookings(id),
  escrow_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions (reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions (created_at);

-- 8. ESCROW TABLE (escrows to match app code)
CREATE TABLE IF NOT EXISTS public.escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded', 'disputed')),
  released_by UUID REFERENCES public.users(id),
  released_at TIMESTAMP,
  released_to UUID REFERENCES public.users(id),
  refund_reason TEXT,
  refunded_at TIMESTAMP,
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrows_booking ON public.escrows (booking_id);
CREATE INDEX IF NOT EXISTS idx_escrows_from_user ON public.escrows (from_user_id);
CREATE INDEX IF NOT EXISTS idx_escrows_to_user ON public.escrows (to_user_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON public.escrows (status);

-- updated_at triggers (reuse function from previous migration if present)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS wallets_updated_at ON public.wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS escrows_updated_at ON public.escrows;
CREATE TRIGGER escrows_updated_at
  BEFORE UPDATE ON public.escrows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
