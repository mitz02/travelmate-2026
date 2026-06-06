import express, { Router, Response } from 'express';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';
import Joi from 'joi';

const router: Router = express.Router();

// Chat schema
const messageSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat — List all conversations for the current user
// Returns each conversation with the other participant's profile and last message
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        created_at,
        ride_id,
        rider_id,
        driver_id,
        rides(from, to, departure_time),
        rider:rider_id(id, first_name, last_name, profile_picture, ratings),
        driver:driver_id(id, first_name, last_name, profile_picture, ratings)
      `)
      .or(`rider_id.eq.${req.userId},driver_id.eq.${req.userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get conversations error:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    // Fetch last message for each conversation
    const conversationIds = (conversations || []).map((c: any) => c.id);
    const { data: lastMessages } = conversationIds.length
      ? await supabase
          .from('messages')
          .select('conversation_id, content, created_at, sender_id')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
      : { data: [] };

    // Group last messages by conversation_id
    const lastMsgMap: Record<string, any> = {};
    (lastMessages || []).forEach((msg: any) => {
      if (!lastMsgMap[msg.conversation_id]) {
        lastMsgMap[msg.conversation_id] = msg;
      }
    });

    const result = (conversations || []).map((c: any) => {
      // Determine the "other" participant
      const isRider = c.rider_id === req.userId;
      const otherParticipant = isRider
        ? (Array.isArray(c.driver) ? c.driver[0] : c.driver)
        : (Array.isArray(c.rider) ? c.rider[0] : c.rider);

      const ride = Array.isArray(c.rides) ? c.rides[0] : c.rides;
      const lastMessage = lastMsgMap[c.id];

      return {
        id: c.id,
        rideId: c.ride_id,
        route: ride ? `${ride.from} → ${ride.to}` : null,
        departureTime: ride?.departure_time,
        otherParticipant: otherParticipant
          ? {
              id: otherParticipant.id,
              name: `${otherParticipant.first_name} ${otherParticipant.last_name}`,
              profilePicture: otherParticipant.profile_picture,
              rating: otherParticipant.ratings,
            }
          : null,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              sentAt: lastMessage.created_at,
              isOwn: lastMessage.sender_id === req.userId,
            }
          : null,
        createdAt: c.created_at,
      };
    });

    return res.json({ conversations: result });
  } catch (err) {
    console.error('List conversations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/:conversationId/messages — Fetch message history
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:conversationId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const offset = parseInt((req.query.offset as string) || '0', 10);

    // Verify the user is a participant in this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, rider_id, driver_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant =
      conversation.rider_id === req.userId || conversation.driver_id === req.userId;
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        sender:sender_id(first_name, last_name, profile_picture)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    const result = (messages || []).map((m: any) => {
      const sender = Array.isArray(m.sender) ? m.sender[0] : m.sender;
      return {
        id: m.id,
        content: m.content,
        sentAt: m.created_at,
        isOwn: m.sender_id === req.userId,
        sender: sender
          ? {
              id: m.sender_id,
              name: `${sender.first_name} ${sender.last_name}`,
              profilePicture: sender.profile_picture,
            }
          : null,
      };
    });

    return res.json({ conversationId, messages: result });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/:conversationId/messages — Send a message
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:conversationId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { error: validationError, value } = messageSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError.details[0].message });
    }

    // Verify the user is a participant
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, rider_id, driver_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant =
      conversation.rider_id === req.userId || conversation.driver_id === req.userId;
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: req.userId,
          content: value.content,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to send message' });
    }

    return res.status(201).json({
      id: message.id,
      conversationId: message.conversation_id,
      content: message.content,
      sentAt: message.created_at,
      isOwn: true,
    });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat — Start or get a conversation for a booking/ride
// Body: { rideId }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.body;
    if (!rideId) return res.status(400).json({ error: 'rideId is required' });

    // Get the ride to find the driver
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('id, driver_id')
      .eq('id', rideId)
      .single();

    if (rideError || !ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driver_id === req.userId) {
      return res.status(400).json({ error: 'Driver cannot start a conversation with themselves' });
    }

    // Check if a conversation already exists for this ride + rider
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('ride_id', rideId)
      .eq('rider_id', req.userId)
      .eq('driver_id', ride.driver_id)
      .maybeSingle();

    if (existing) {
      return res.json({ conversationId: existing.id, existing: true });
    }

    // Create a new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert([
        {
          ride_id: rideId,
          rider_id: req.userId,
          driver_id: ride.driver_id,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to start conversation' });
    }

    return res.status(201).json({ conversationId: conversation.id, existing: false });
  } catch (err) {
    console.error('Start conversation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
