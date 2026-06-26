import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '../validators/profile';
import * as profileController from '../controllers/profileController';

const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (jpeg, png, gif, webp) are allowed'));
  },
});

router.get('/:userId', requireAuth, profileController.getProfile);
router.put('/:userId', requireAuth, validate(updateProfileSchema), profileController.updateProfile);
router.post('/:userId/avatar', requireAuth, upload.single('image'), profileController.uploadAvatar);
router.get('/:userId/rating', requireAuth, profileController.getRating);
router.get('/:userId/stats', requireAuth, profileController.getStats);

// Notification Settings
router.get('/:userId/notification-settings', requireAuth, profileController.getNotificationSettings);
router.put('/:userId/notification-settings', requireAuth, profileController.updateNotificationSettings);
export default router;
