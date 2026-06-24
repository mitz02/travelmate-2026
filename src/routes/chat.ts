import express, { Router, Response } from 'express';
import { query, queryOne } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import Joi from 'joi';

const router: Router = express.Router();

const messageSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversations = await query(`
      SELECT c.id, c.created_at, c.ride_id, c.rider_id, c.driver_id,
        jsonb_build_object('from', r.from, 'to', r.to, 'departure_time', r.departure_time) AS rides,
        jsonb_build_object('id', rp.id, 'first_name', rp.first_name, 'last_name', rp.last_name, 'profile_picture', rp.profile_picture, 'ratings', rp.ratings) AS rider,
        jsonb_build_object('id', dp.id, 'first_name', dp.first_name, 'last_name', dp.last_name, 'profile_picture', dp.profile_picture, 'ratings', dp.ratings) AS driver
      FROM conversations c
      LEFT JOIN rides r ON r.id = c.ride_id
      LEFT JOIN profiles rp ON rp.id = c.rider_id
      LEFT JOIN profiles dp ON dp.id = c.driver_id
      WHERE c.rider_id = $1 OR c.driver_id = $1
      ORDER BY c.created_at DESC
    `, [userId]);

    const conversationIds = conversations.map((c: any) => c.id);
    const lastMessages = conversationIds.length > 0
      ? await query(`
          SELECT DISTINCT ON (conversation_id) conversation_id, content, created_at, sender_id
          FROM messages
          WHERE conversation_id = ANY($1::uuid[])
          ORDER BY conversation_id, created_at DESC
        `, [conversationIds])
      : [];

    const lastMsgMap: Record<string, any> = {};
    lastMessages.forEach((msg: any) => {
      if (!lastMsgMap[msg.conversation_id]) {
        lastMsgMap[msg.conversation_id] = msg;
      }
    });

    const result = conversations.map((c: any) => {
      const isRider = c.rider_id === userId;
      const otherParticipant = isRider ? c.driver : c.rider;
      const ride = c.rides;
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
              isOwn: lastMessage.sender_id === userId,
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

router.get('/:conversationId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const offset = parseInt((req.query.offset as string) || '0', 10);

    const conversation = await queryOne(`
      SELECT id, rider_id, driver_id FROM conversations WHERE id = $1
    `, [conversationId]);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant =
      conversation.rider_id === req.user!.id || conversation.driver_id === req.user!.id;
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const messages = await query(`
      SELECT m.id, m.content, m.created_at, m.sender_id,
        jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'profile_picture', p.profile_picture) AS sender
      FROM messages m
      LEFT JOIN profiles p ON p.id = m.sender_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      OFFSET $2 LIMIT $3
    `, [conversationId, offset, limit]);

    const result = messages.map((m: any) => {
      const sender = m.sender;
      return {
        id: m.id,
        content: m.content,
        sentAt: m.created_at,
        isOwn: m.sender_id === req.user!.id,
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

router.post('/:conversationId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { error: validationError, value } = messageSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError.details[0].message });
    }

    const conversation = await queryOne(`
      SELECT id, rider_id, driver_id FROM conversations WHERE id = $1
    `, [conversationId]);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant =
      conversation.rider_id === req.user!.id || conversation.driver_id === req.user!.id;
    if (!isParticipant) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const message = await queryOne(`
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, conversation_id, content, created_at
    `, [conversationId, req.user!.id, value.content]);

    if (!message) {
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

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.body;
    if (!rideId) return res.status(400).json({ error: 'rideId is required' });

    const ride = await queryOne(`
      SELECT id, driver_id FROM rides WHERE id = $1
    `, [rideId]);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.driver_id === req.user!.id) {
      return res.status(400).json({ error: 'Driver cannot start a conversation with themselves' });
    }

    const existing = await queryOne(`
      SELECT id FROM conversations
      WHERE ride_id = $1 AND rider_id = $2 AND driver_id = $3
    `, [rideId, req.user!.id, ride.driver_id]);

    if (existing) {
      return res.json({ conversationId: existing.id, existing: true });
    }

    const conversation = await queryOne(`
      INSERT INTO conversations (ride_id, rider_id, driver_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [rideId, req.user!.id, ride.driver_id]);

    if (!conversation) {
      return res.status(500).json({ error: 'Failed to start conversation' });
    }

    return res.status(201).json({ conversationId: conversation.id, existing: false });
  } catch (err) {
    console.error('Start conversation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
