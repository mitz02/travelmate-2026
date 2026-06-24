-- Ratings, Chats, Chat_Participants, Messages
-- Depends on: users, bookings (from earlier migrations)
-- App uses .from('chat_messages') -> view chat_messages on messages.
-- App uses "comment" for ratings; table has "review" (map in app or add comment column).

-- 11. RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  role VARCHAR(10) CHECK (role IN ('driver', 'rider')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_to_user ON public.ratings (to_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_from_user ON public.ratings (from_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_booking ON public.ratings (booking_id);

-- 12. CHATS TABLE
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'support')),
  last_message TEXT,
  last_message_at TIMESTAMP,
  last_message_sender UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_booking ON public.chats (booking_id);
CREATE INDEX IF NOT EXISTS idx_chats_last_message ON public.chats (last_message_at);

-- 13. CHAT_PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.chat_participants (
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP DEFAULT NOW(),
  is_typing BOOLEAN DEFAULT false,
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_user ON public.chat_participants (user_id);

-- 14. MESSAGES TABLE (view chat_messages for app compatibility)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id),
  content TEXT,
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'location', 'payment_request')),
  media_url TEXT,
  metadata JSONB,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages (chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages (created_at);

-- View so app .from('chat_messages') keeps working
CREATE OR REPLACE VIEW public.chat_messages AS SELECT * FROM public.messages;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ratings_updated_at ON public.ratings;
CREATE TRIGGER ratings_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS chats_updated_at ON public.chats;
CREATE TRIGGER chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
