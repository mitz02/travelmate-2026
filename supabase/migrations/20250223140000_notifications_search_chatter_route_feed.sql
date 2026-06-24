-- Notifications, Search Chatter Requests/Offers, Route Feed Statuses
-- Depends on: users, vehicles, bookings (from earlier migrations)

-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  action_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications (created_at);

-- 16. SEARCH_CHATTER_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.search_chatter_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  origin_lat DECIMAL(10,8),
  origin_lng DECIMAL(11,8),
  destination_address TEXT NOT NULL,
  destination_lat DECIMAL(10,8),
  destination_lng DECIMAL(11,8),
  travel_date DATE NOT NULL,
  flexible_date BOOLEAN DEFAULT false,
  flexible_days INTEGER DEFAULT 3,
  seats_needed INTEGER NOT NULL CHECK (seats_needed > 0),
  max_price DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatter_rider ON public.search_chatter_requests (rider_id);
CREATE INDEX IF NOT EXISTS idx_chatter_status ON public.search_chatter_requests (status);
CREATE INDEX IF NOT EXISTS idx_chatter_dates ON public.search_chatter_requests (travel_date);

-- 17. SEARCH_CHATTER_OFFERS TABLE
CREATE TABLE IF NOT EXISTS public.search_chatter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.search_chatter_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  departure_time TIME,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_request_driver_pending
  ON public.search_chatter_offers (request_id, driver_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_offers_request ON public.search_chatter_offers (request_id);
CREATE INDEX IF NOT EXISTS idx_offers_driver ON public.search_chatter_offers (driver_id);

-- 18. ROUTE_FEED_STATUSES TABLE
CREATE TABLE IF NOT EXISTS public.route_feed_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  route_name VARCHAR(255),
  route_lat DECIMAL(10,8),
  route_lng DECIMAL(11,8),
  content TEXT NOT NULL,
  image_url TEXT,
  type VARCHAR(30) CHECK (type IN ('traffic', 'safety', 'road_condition', 'general')),
  view_count INTEGER DEFAULT 0,
  reaction_counts JSONB DEFAULT '{"like": 0, "concern": 0, "thanks": 0}',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_user ON public.route_feed_statuses (user_id);
CREATE INDEX IF NOT EXISTS idx_feed_route ON public.route_feed_statuses (route_name);
CREATE INDEX IF NOT EXISTS idx_feed_created ON public.route_feed_statuses (created_at);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS search_chatter_requests_updated_at ON public.search_chatter_requests;
CREATE TRIGGER search_chatter_requests_updated_at
  BEFORE UPDATE ON public.search_chatter_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS search_chatter_offers_updated_at ON public.search_chatter_offers;
CREATE TRIGGER search_chatter_offers_updated_at
  BEFORE UPDATE ON public.search_chatter_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS route_feed_statuses_updated_at ON public.route_feed_statuses;
CREATE TRIGGER route_feed_statuses_updated_at
  BEFORE UPDATE ON public.route_feed_statuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
