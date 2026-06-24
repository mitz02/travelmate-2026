-- Replace escrows with full escrow table; add kyc_documents and bank_accounts
-- App uses .from('escrows') so we add a view for backward compatibility

-- Drop existing escrows table (from previous migration) so we can create escrow
DROP TRIGGER IF EXISTS escrows_updated_at ON public.escrows;
DROP TABLE IF EXISTS public.escrows CASCADE;

-- 8. ESCROW TABLE (full schema)
CREATE TABLE IF NOT EXISTS public.escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded', 'disputed')),
  held_at TIMESTAMP DEFAULT NOW(),
  released_at TIMESTAMP,
  refunded_at TIMESTAMP,
  release_transaction_id UUID REFERENCES public.transactions(id),
  refund_transaction_id UUID REFERENCES public.transactions(id),
  dispute_reason TEXT,
  dispute_raised_by UUID REFERENCES public.users(id),
  dispute_raised_at TIMESTAMP,
  dispute_resolved_at TIMESTAMP,
  dispute_resolution TEXT,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  net_release DECIMAL(12,2) GENERATED ALWAYS AS (amount - platform_fee) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_escrow_booking ON public.escrow (booking_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON public.escrow (status);
CREATE INDEX IF NOT EXISTS idx_escrow_from_user ON public.escrow (from_user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_to_user ON public.escrow (to_user_id);

-- View so existing app code using .from('escrows') keeps working
CREATE OR REPLACE VIEW public.escrows AS SELECT * FROM public.escrow;

-- Trigger for updated_at on escrow
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS escrow_updated_at ON public.escrow;
CREATE TRIGGER escrow_updated_at
  BEFORE UPDATE ON public.escrow
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. KYC DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type VARCHAR(30) CHECK (document_type IN ('national_id', 'passport', 'drivers_license', 'voters_card', 'utility_bill')),
  document_number VARCHAR(100),
  front_image_url TEXT,
  back_image_url TEXT,
  selfie_url TEXT,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT,
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMP,
  extracted_data JSONB,
  face_match_score DECIMAL(5,2),
  expires_at DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON public.kyc_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_documents (verification_status);

DROP TRIGGER IF EXISTS kyc_documents_updated_at ON public.kyc_documents;
CREATE TRIGGER kyc_documents_updated_at
  BEFORE UPDATE ON public.kyc_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. BANK ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL,
  bank_code VARCHAR(10) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  recipient_code VARCHAR(100),
  is_verified BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  verification_attempts INTEGER DEFAULT 0,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, account_number, bank_code)
);

CREATE INDEX IF NOT EXISTS idx_banks_user ON public.bank_accounts (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_banks_default ON public.bank_accounts (user_id) WHERE is_default = true;

DROP TRIGGER IF EXISTS bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
