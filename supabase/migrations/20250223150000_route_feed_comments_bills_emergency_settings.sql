-- Route Feed Comments, Bill Payments, Emergency Contacts/Alerts, Settings
-- Depends on: users, wallets, transactions, bookings, route_feed_statuses (from earlier migrations)

-- 19. ROUTE_FEED_COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.route_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id UUID NOT NULL REFERENCES public.route_feed_statuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_status ON public.route_feed_comments (status_id);

-- 20. BILL_PAYMENTS TABLE (fixed typo: INDEX_idx_ -> idx_)
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  service_type VARCHAR(30) CHECK (service_type IN ('airtime', 'data', 'electricity', 'tv', 'internet')),
  provider VARCHAR(50) NOT NULL,
  customer_id VARCHAR(100),
  customer_name VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0,
  plan_code VARCHAR(50),
  plan_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  provider_status VARCHAR(50),
  provider_reference VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_user ON public.bill_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bill_payments (status);
CREATE INDEX IF NOT EXISTS idx_bills_provider_ref ON public.bill_payments (provider_reference);

-- 21. EMERGENCY_CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  relationship VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_user ON public.emergency_contacts (user_id);

-- 22. EMERGENCY_ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(30) DEFAULT 'sos' CHECK (type IN ('sos', 'accident', 'breakdown', 'harassment')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'responded', 'cancelled', 'resolved')),
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_address TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  message TEXT,
  contacts_notified TEXT[],
  responded_by UUID REFERENCES public.users(id),
  responded_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON public.emergency_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.emergency_alerts (status);

-- 23. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initial settings (ignore if rows exist)
INSERT INTO public.settings (key, value, description)
VALUES
  ('platform_fee', '{"percentage": 5, "minimum": 100, "maximum": 5000}', 'Platform fee configuration'),
  ('withdrawal_limits', '{"daily": 1000000, "weekly": 5000000, "monthly": 20000000}', 'Withdrawal limits'),
  ('kyc_requirements', '{"driver": ["id", "selfie", "bank"], "rider": ["phone"]}', 'KYC requirements by role')
ON CONFLICT (key) DO NOTHING;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bill_payments_updated_at ON public.bill_payments;
CREATE TRIGGER bill_payments_updated_at
  BEFORE UPDATE ON public.bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS emergency_contacts_updated_at ON public.emergency_contacts;
CREATE TRIGGER emergency_contacts_updated_at
  BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS settings_updated_at ON public.settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
