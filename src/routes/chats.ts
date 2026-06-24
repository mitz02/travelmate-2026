import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createChatSchema, sendMessageSchema, typingSchema } from '../validators/chats';
import * as chatsController from '../controllers/chatsController';

const router = Router();

router.post('/', requireAuth, validate(createChatSchema), chatsController.createChat);
router.get('/unread/:userId', requireAuth, chatsController.getUnreadCount);
router.get('/:userId', requireAuth, chatsController.getUserChats);
router.get('/:chatId/messages', requireAuth, chatsController.getMessages);
router.post('/:chatId/messages', requireAuth, validate(sendMessageSchema), chatsController.sendMessage);
router.put('/:chatId/read', requireAuth, chatsController.markAsRead);
router.post('/:chatId/typing', requireAuth, validate(typingSchema), chatsController.typingIndicator);
router.delete('/:chatId', requireAuth, chatsController.deleteChat);

export default router;
