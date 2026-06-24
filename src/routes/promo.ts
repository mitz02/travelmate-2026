import { Router, Response } from 'express';
import Joi from 'joi';
import { AuthRequest, requireAuth } from '../middleware/auth';
import * as promoController from '../controllers/promoController';

const router = Router();

const applyPromoSchema = Joi.object({
  code: Joi.string().required(),
});

router.get('/', requireAuth, promoController.getAvailablePromos);

router.post('/apply', requireAuth, async (req: AuthRequest, res: Response) => {
  const { error } = applyPromoSchema.validate(req.body);
  if (error) { res.status(400).json({ error: error.details[0].message }); return; }
  return promoController.applyPromo(req, res);
});

export default router;
