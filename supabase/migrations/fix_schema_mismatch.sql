-- ════════════════════════════════════════════════════════════════════════════════
-- Schema Alignment Migration
-- Run in Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────────
-- 0. Drop ALL existing FK constraints referencing profiles.id
--    so we can safely re-link to auth.users.id
-- ────────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE wallets             DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE transactions        DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE kyc_submissions     DROP CONSTRAINT IF EXISTS kyc_submissions_user_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE vehicles            DROP CONSTRAINT IF EXISTS vehicles_owner_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE conversations       DROP CONSTRAINT IF EXISTS conversations_rider_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE conversations       DROP CONSTRAINT IF EXISTS conversations_driver_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE messages            DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE rides               DROP CONSTRAINT IF EXISTS rides_driver_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE bookings            DROP CONSTRAINT IF EXISTS bookings_rider_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES — add columns that controllers expect
-- ────────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id                UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating                 NUMERIC(3,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_ratings          INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trips_count            INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS earnings_total         NUMERIC(12,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings  JSONB DEFAULT '{}'::jsonb;

-- ────────────────────────────────────────────────────────────────────────────────
-- 2. Backfill user_id by matching email against auth.users
-- ────────────────────────────────────────────────────────────────────────────────
UPDATE profiles p
SET user_id = au.id
FROM auth.users au
WHERE LOWER(p.email) = LOWER(au.email)
  AND p.user_id IS NULL;

-- ────────────────────────────────────────────────────────────────────────────────
-- 3. Delete profiles that have no matching auth.users (orphaned)
--    Delete child rows first, then parent profiles
-- ────────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN DELETE FROM transactions   WHERE user_id IN (SELECT id FROM profiles WHERE user_id IS NULL); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM wallets        WHERE user_id IN (SELECT id FROM profiles WHERE user_id IS NULL); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM kyc_submissions WHERE user_id IN (SELECT id FROM profiles WHERE user_id IS NULL); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM messages       WHERE sender_id IN (SELECT id FROM profiles WHERE user_id IS NULL); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM conversations  WHERE rider_id IN (SELECT id FROM profiles WHERE user_id IS NULL) OR driver_id IN (SELECT id FROM profiles WHERE user_id IS NULL); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM vehicles       WHERE owner_id IN (SELECT id FROM profiles WHERE user_id IS NULL); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM bookings       WHERE rider_id IN (SELECT id FROM profiles WHERE user_id IS NULL); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DELETE FROM rides          WHERE driver_id IN (SELECT id FROM profiles WHERE user_id IS NULL); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DELETE FROM profiles WHERE user_id IS NULL;

-- ────────────────────────────────────────────────────────────────────────────────
-- 4. Backfill other profile fields
-- ────────────────────────────────────────────────────────────────────────────────
UPDATE profiles SET full_name   = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
  WHERE full_name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);

UPDATE profiles SET avatar_url  = profile_picture
  WHERE avatar_url IS NULL AND profile_picture IS NOT NULL;

UPDATE profiles SET rating      = ROUND(ratings::numeric, 2)
  WHERE rating = 0 AND ratings IS NOT NULL AND ratings > 0;

UPDATE profiles SET is_admin    = (role = 'admin')
  WHERE is_admin IS NULL;

-- ────────────────────────────────────────────────────────────────────────────────
-- 5. Add constraints to profiles
-- ────────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ALTER COLUMN user_id SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- ────────────────────────────────────────────────────────────────────────────────
-- 6. Re-link all FKs to reference auth.users(id) instead of profiles(id)
-- ────────────────────────────────────────────────────────────────────────────────

-- 6a. WALLETS
DO $$ BEGIN
  UPDATE wallets w SET user_id = p.user_id
  FROM profiles p WHERE w.user_id = p.id AND p.user_id IS NOT NULL;
  ALTER TABLE wallets ADD CONSTRAINT wallets_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 6b. WALLETS — add status column
DO $$ BEGIN
  ALTER TABLE wallets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'frozen'));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 6c. TRANSACTIONS
DO $$ BEGIN
  UPDATE transactions t SET user_id = p.user_id
  FROM profiles p WHERE t.user_id = p.id AND p.user_id IS NOT NULL;
  ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 6d. KYC_SUBMISSIONS
DO $$ BEGIN
  UPDATE kyc_submissions k SET user_id = p.user_id
  FROM profiles p WHERE k.user_id = p.id AND p.user_id IS NOT NULL;
  ALTER TABLE kyc_submissions ADD CONSTRAINT kyc_submissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 6e. VEHICLES
DO $$ BEGIN
  UPDATE vehicles v SET owner_id = p.user_id
  FROM profiles p WHERE v.owner_id = p.id AND p.user_id IS NOT NULL;
  ALTER TABLE vehicles ADD CONSTRAINT vehicles_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 6f. CONVERSATIONS
DO $$ BEGIN
  UPDATE conversations c SET rider_id = p.user_id
  FROM profiles p WHERE c.rider_id = p.id AND p.user_id IS NOT NULL;
  UPDATE conversations c SET driver_id = p.user_id
  FROM profiles p WHERE c.driver_id = p.id AND p.user_id IS NOT NULL;
  ALTER TABLE conversations ADD CONSTRAINT conversations_rider_id_fkey
    FOREIGN KEY (rider_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE conversations ADD CONSTRAINT conversations_driver_id_fkey
    FOREIGN KEY (driver_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 6g. MESSAGES
DO $$ BEGIN
  UPDATE messages m SET sender_id = p.user_id
  FROM profiles p WHERE m.sender_id = p.id AND p.user_id IS NOT NULL;
  ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 6h. RIDES
DO $$ BEGIN
  UPDATE rides r SET driver_id = p.user_id
  FROM profiles p WHERE r.driver_id = p.id AND p.user_id IS NOT NULL;
  ALTER TABLE rides ADD CONSTRAINT rides_driver_id_fkey
    FOREIGN KEY (driver_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 6i. BOOKINGS
DO $$ BEGIN
  UPDATE bookings b SET rider_id = p.user_id
  FROM profiles p WHERE b.rider_id = p.id AND p.user_id IS NOT NULL;
  ALTER TABLE bookings ADD CONSTRAINT bookings_rider_id_fkey
    FOREIGN KEY (rider_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────────
-- 7. TRIGGER: auto-create profile row when user signs up via Supabase Auth
-- ────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, email, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'rider'),
    new.email,
    new.phone
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────────
-- 8. RLS POLICIES for profiles
-- ────────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can do all" ON profiles;
CREATE POLICY "Service role can do all"
  ON profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════════════════════════════════
