import { Router, Response } from 'express';
import Joi from 'joi';
import { AuthRequest, requireAuth } from '../middleware/auth';
import * as referralController from '../controllers/referralController';

const router = Router();

const applyReferralSchema = Joi.object({
  code: Joi.string().required(),
});

router.get('/', requireAuth, referralController.getReferrals);

router.post('/apply', requireAuth, async (req: AuthRequest, res: Response) => {
  const { error } = applyReferralSchema.validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  return referralController.applyReferral(req, res);
});

export default router;
