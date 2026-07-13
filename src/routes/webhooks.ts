import { Router } from 'express';
import * as webhooksController from '../controllers/webhooksController';

const router = Router();

router.post('/paystack', webhooksController.paystackWebhook);
router.post('/bardetech', webhooksController.bardetechWebhook);
router.post('/termii', webhooksController.termiiWebhook);

export default router;
