-- Add missing columns to existing reviews table
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS role TEXT;

-- Drop old unique constraint on booking_id
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_key;

-- Add unique constraint on (reviewer_id, ride_id) to prevent rating same ride twice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_reviewer_ride_unique'
  ) THEN
    DELETE FROM public.reviews WHERE reviewer_id IS NULL OR ride_id IS NULL;
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_ride_unique UNIQUE (reviewer_id, ride_id);
  END IF;
END $$;
