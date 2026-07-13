import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  submitKycSchema,
  verifyAccountSchema,
  adminApproveSchema,
  adminRejectSchema,
  verifyNinSchema,
  verifyBvnSchema,
  verifyDlSchema,
} from '../validators/kyc';
import * as kycController from '../controllers/kycController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (jpeg, png, gif, webp) are allowed'));
  },
});

router.post('/submit', requireAuth, validate(submitKycSchema), kycController.submitKyc);
router.get('/status', requireAuth, kycController.getKycStatus);
router.post('/verify-account', requireAuth, validate(verifyAccountSchema), kycController.verifyAccount);
router.get('/banks', requireAuth, kycController.listBanks);
router.post('/face-verification', requireAuth, upload.single('selfie'), kycController.faceVerification);
router.post('/verify-id', requireAuth, upload.single('document'), kycController.verifyId);
router.post('/verify-nin', requireAuth, validate(verifyNinSchema), kycController.verifyNin);
router.post('/verify-bvn', requireAuth, validate(verifyBvnSchema), kycController.verifyBvn);
router.post('/verify-dl', requireAuth, validate(verifyDlSchema), kycController.verifyDriverLicense);

router.get('/admin/pending', requireAuth, requireAdmin, kycController.adminListPending);
router.get('/admin/:id', requireAuth, requireAdmin, kycController.adminGetKycDetail);
router.post('/admin/approve/:id', requireAuth, requireAdmin, validate(adminApproveSchema), kycController.adminApprove);
router.post('/admin/reject/:id', requireAuth, requireAdmin, validate(adminRejectSchema), kycController.adminReject);

export default router;
