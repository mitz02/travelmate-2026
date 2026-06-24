import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createBookingSchema,
  cancelBookingSchema,
  payBookingSchema,
  rateBookingSchema,
} from '../validators/bookings';
import * as bookingsController from '../controllers/bookingsController';

const router = Router();

router.get('/driver/pending', requireAuth, bookingsController.getDriverPendingBookings);
router.post('/', requireAuth, validate(createBookingSchema), bookingsController.createBooking);
router.get('/user/:userId', requireAuth, bookingsController.getUserBookings);
router.get('/:bookingId', requireAuth, bookingsController.getBooking);
router.put('/:bookingId/accept', requireAuth, bookingsController.acceptBooking);
router.put('/:bookingId/reject', requireAuth, bookingsController.rejectBooking);
router.put('/:bookingId/cancel', requireAuth, validate(cancelBookingSchema), bookingsController.cancelBooking);
router.post('/:bookingId/pay', requireAuth, validate(payBookingSchema), bookingsController.payBooking);
router.post('/:bookingId/complete', requireAuth, bookingsController.completeBooking);
router.post('/:bookingId/rate', requireAuth, validate(rateBookingSchema), bookingsController.rateBooking);
router.post('/:bookingId/confirm-paystack', requireAuth, bookingsController.confirmPaystackBooking);
router.get('/:bookingId/receipt', requireAuth, bookingsController.getReceipt);
router.post('/:bookingId/confirm-pickup', requireAuth, bookingsController.confirmPickup);
router.post('/:bookingId/confirm-dropoff', requireAuth, bookingsController.confirmDropoff);

export default router;
