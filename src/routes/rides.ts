import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRideSchema, updateRideSchema, cancelRideSchema } from '../validators/rides';
import * as ridesController from '../controllers/ridesController';

const router = Router();

router.post('/', requireAuth, validate(createRideSchema), ridesController.createRide);
router.get('/', ridesController.getRides);
router.get('/popular', ridesController.getPopularRoutes);
router.get('/search', ridesController.searchRides);
router.get('/driver/:userId', requireAuth, ridesController.getDriverRides);
router.get('/:rideId', requireAuth, ridesController.getRideById);
router.put('/:rideId', requireAuth, validate(updateRideSchema), ridesController.updateRide);
router.delete('/:rideId', requireAuth, validate(cancelRideSchema), ridesController.cancelRide);
router.post('/:rideId/repost', requireAuth, ridesController.repostRide);
router.get('/:rideId/bookings', requireAuth, ridesController.getRideBookings);
router.post('/:rideId/complete', requireAuth, ridesController.completeRide);
router.post('/:rideId/cancel', requireAuth, validate(cancelRideSchema), ridesController.cancelRide);

export default router;
