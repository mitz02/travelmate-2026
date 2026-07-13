import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUserStatusSchema, updateFeesSchema, updateReferralSettingsSchema } from '../validators/admin';
import * as adminController from '../controllers/adminController';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users', adminController.listUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId/status', validate(updateUserStatusSchema), adminController.updateUserStatus);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/rides', adminController.listRides);
router.put('/rides/:rideId', adminController.adminUpdateRide);
router.get('/bookings', adminController.listBookings);
router.get('/bookings/:bookingId', adminController.getBookingDetails);
router.get('/transactions', adminController.listTransactions);
router.get('/escrow', adminController.listEscrowIssues);
router.get('/kyc/pending', adminController.listPendingKyc);
router.get('/statistics', adminController.getStatistics);
router.post('/fees/update', validate(updateFeesSchema), adminController.updateFees);
router.post('/bookings/:bookingId/complete', adminController.adminCompleteBooking);
router.post('/escrow/:escrowId/release', adminController.adminReleaseEscrow);
router.post('/wallets/fund-all', adminController.fundAllRiders);
router.get('/completions/pending', adminController.listPendingCompletions);
router.post('/completions/:bookingId/approve', adminController.approveCompletion);
router.post('/completions/:bookingId/deny', adminController.denyCompletion);

// Wallet management
router.get('/wallets', adminController.listWallets);
router.get('/wallets/:userId/transactions', adminController.listWalletTransactions);
router.post('/wallets/:userId/credit', adminController.creditWallet);
router.post('/wallets/:userId/debit', adminController.debitWallet);

// Referral management
router.get('/referrals', adminController.listReferrals);
router.get('/referrals/stats', adminController.getReferralStats);
router.get('/referrals/settings', adminController.getReferralSettings);
router.put('/referrals/settings', validate(updateReferralSettingsSchema), adminController.updateReferralSettings);
router.post('/referrals/:referralId/complete', adminController.completeReferral);
router.post('/referrals/:referralId/refund', adminController.refundReferral);

export default router;
