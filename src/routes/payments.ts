import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { initializePaymentSchema, chargeCardSchema, saveCardSchema } from '../validators/payments';
import * as paymentsController from '../controllers/paymentsController';

const router = Router();

router.post('/initialize', requireAuth, validate(initializePaymentSchema), paymentsController.initializePayment);
router.get('/verify/:reference', paymentsController.verifyPayment);
router.post('/charge-card', requireAuth, validate(chargeCardSchema), paymentsController.chargeCard);
router.post('/methods/card', requireAuth, validate(saveCardSchema), paymentsController.saveCard);
router.get('/methods/:userId', requireAuth, paymentsController.getSavedMethods);
router.delete('/methods/:methodId', requireAuth, paymentsController.deleteMethod);

export default router;
