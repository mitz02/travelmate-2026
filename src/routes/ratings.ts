import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRatingSchema, updateRatingSchema } from '../validators/ratings';
import * as ratingsController from '../controllers/ratingsController';

const router = Router();

router.post('/', requireAuth, validate(createRatingSchema), ratingsController.createRating);
router.get('/user/:userId/summary', requireAuth, ratingsController.getRatingSummary);
router.get('/user/:userId', requireAuth, ratingsController.getUserRatings);
router.get('/booking/:bookingId', requireAuth, ratingsController.getBookingRatings);
router.put('/:ratingId', requireAuth, validate(updateRatingSchema), ratingsController.updateRating);
router.delete('/:ratingId', requireAuth, ratingsController.deleteRating);

export default router;
