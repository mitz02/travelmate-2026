import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  signupSchema,
  signinSchema,
  signoutSchema,
  refreshSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
  switchRoleSchema,
  googleAuthSchema,
} from '../validators/auth';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/signin', validate(signinSchema), authController.signin);
router.post('/login', validate(signinSchema), authController.signin);
router.post('/signout', validate(signoutSchema), authController.signout);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.get('/me', requireAuth, authController.me);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyFirebasePhone);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);
router.post('/switch-role', requireAuth, validate(switchRoleSchema), authController.switchRole);
router.post('/google', validate(googleAuthSchema), authController.google);

/* 2FA routes */
router.get('/2fa/status', requireAuth, authController.get2FAStatus);
router.post('/2fa/setup', requireAuth, authController.setup2FA);
router.post('/2fa/verify', requireAuth, authController.verify2FA);
router.post('/2fa/disable', requireAuth, authController.disable2FA);
router.post('/2fa/authenticate', authController.authenticate2FA);

export default router;
