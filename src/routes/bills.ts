import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  buyAirtimeSchema,
  buyDataSchema,
  payElectricitySchema,
  verifyMeterSchema,
} from '../validators/bills';
import * as billsController from '../controllers/billsController';

const router = Router();

router.get('/services', billsController.listServices);
router.get('/providers', billsController.listProviders);
router.get('/data-plans', billsController.getDataPlans);
router.get('/saved-plans/tv', billsController.getSavedTvPlans);
router.get('/saved-plans/data', billsController.getSavedDataPlans);
router.get('/history/:userId', requireAuth, billsController.getBillHistory);
router.post('/airtime', requireAuth, validate(buyAirtimeSchema), billsController.buyAirtime);
router.post('/data', requireAuth, validate(buyDataSchema), billsController.buyData);
router.post('/electricity', requireAuth, validate(payElectricitySchema), billsController.payElectricity);
router.post('/verify-meter', validate(verifyMeterSchema), billsController.verifyMeter);

export default router;
