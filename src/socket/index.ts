import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { query, queryOne } from '../config/database';

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = verifyToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId;

    // Join all conversation rooms the user is a participant in
    try {
      const convs = await query(
        'SELECT id FROM conversations WHERE rider_id = $1 OR driver_id = $1',
        [userId]
      );
      for (const conv of convs || []) {
        socket.join(`conv:${conv.id}`);
      }
      socket.join(`user:${userId}`);
    } catch { /* ignore */ }

    socket.on('join_conversation', (convId: string) => {
      socket.join(`conv:${convId}`);
    });

    socket.on('leave_conversation', (convId: string) => {
      socket.leave(`conv:${convId}`);
    });

    socket.on('send_message', async (data: { conversationId: string; content: string }) => {
      try {
        const conv = await queryOne(
          'SELECT id, rider_id, driver_id FROM conversations WHERE id = $1',
          [data.conversationId]
        );
        if (!conv) return socket.emit('error', { message: 'Conversation not found' });
        if (conv.rider_id !== userId && conv.driver_id !== userId) {
          return socket.emit('error', { message: 'Not a participant' });
        }

        const msg = await queryOne(
          `INSERT INTO messages (conversation_id, sender_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, conversation_id, content, created_at`,
          [data.conversationId, userId, data.content]
        );

        if (!msg) return;

        // Get sender info
        const sender = await queryOne(
          'SELECT id, first_name, last_name, profile_picture FROM profiles WHERE id = $1',
          [userId]
        );

        const messagePayload = {
          id: msg.id,
          conversationId: msg.conversation_id,
          content: msg.content,
          sentAt: msg.created_at,
          isOwn: false,
          sender: sender ? {
            id: sender.id,
            name: `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'User',
            profilePicture: sender.profile_picture,
          } : null,
        };

        // Emit to the conversation room (everyone including sender)
        io?.to(`conv:${data.conversationId}`).emit('new_message', messagePayload);

        // Also emit to the individual user room for notification purposes
        const otherUserId = conv.rider_id === userId ? conv.driver_id : conv.rider_id;
        const otherName = sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Someone' : 'Someone';
        io?.to(`user:${otherUserId}`).emit('chat_notification', {
          conversationId: data.conversationId,
          senderName: otherName,
          content: msg.content,
        });
      } catch { /* ignore */ }
    });

    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    socket.on('disconnect', () => { /* cleanup handled by socket.io */ });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}
