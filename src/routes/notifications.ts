import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  sendNotificationSchema,
  registerTokenSchema,
  unregisterTokenSchema,
} from '../validators/notifications';
import * as notificationsController from '../controllers/notificationsController';

const router = Router();

router.post('/send', requireAuth, validate(sendNotificationSchema), notificationsController.sendNotification);
router.post('/register-token', requireAuth, validate(registerTokenSchema), notificationsController.registerPushToken);
router.delete('/unregister-token', requireAuth, validate(unregisterTokenSchema), notificationsController.unregisterPushToken);
router.get('/me', requireAuth, notificationsController.getNotifications);
router.put('/read-all', requireAuth, notificationsController.markAllRead);
router.get('/:userId', requireAuth, notificationsController.getNotifications);
router.put('/:userId/read-all', requireAuth, notificationsController.markAllRead);
router.put('/:notificationId/read', requireAuth, notificationsController.markNotificationRead);
router.delete('/:notificationId', requireAuth, notificationsController.deleteNotification);

export default router;
