import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { startTrackingSchema, updateLocationSchema, deviationSchema } from '../validators/tracking';
import * as trackingController from '../controllers/trackingController';

const router = Router();

router.post('/deviation', requireAuth, validate(deviationSchema), trackingController.reportDeviation);
router.get('/eta', trackingController.calculateEta);
router.post('/:bookingId/start', requireAuth, validate(startTrackingSchema), trackingController.startTracking);
router.get('/:bookingId/live', requireAuth, trackingController.getLiveLocation);
router.get('/:bookingId/history', requireAuth, trackingController.getLocationHistory);
router.post('/:bookingId/end', requireAuth, trackingController.endTracking);
router.post('/:trackingId/update', requireAuth, validate(updateLocationSchema), trackingController.updateLocation);

export default router;
