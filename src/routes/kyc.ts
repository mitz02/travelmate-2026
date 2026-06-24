import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  submitKycSchema,
  verifyAccountSchema,
  faceVerificationSchema,
  verifyIdSchema,
  adminApproveSchema,
  adminRejectSchema,
} from '../validators/kyc';
import * as kycController from '../controllers/kycController';

const router = Router();

router.post('/submit', requireAuth, validate(submitKycSchema), kycController.submitKyc);
router.get('/status', requireAuth, kycController.getKycStatus);
router.post('/verify-account', requireAuth, validate(verifyAccountSchema), kycController.verifyAccount);
router.get('/banks', requireAuth, kycController.listBanks);
router.post('/face-verification', requireAuth, validate(faceVerificationSchema), kycController.faceVerification);
router.post('/verify-id', requireAuth, validate(verifyIdSchema), kycController.verifyId);

router.get('/admin/pending', requireAuth, requireAdmin, kycController.adminListPending);
router.get('/admin/:id', requireAuth, requireAdmin, kycController.adminGetKycDetail);
router.post('/admin/approve/:id', requireAuth, requireAdmin, validate(adminApproveSchema), kycController.adminApprove);
router.post('/admin/reject/:id', requireAuth, requireAdmin, validate(adminRejectSchema), kycController.adminReject);

export default router;
