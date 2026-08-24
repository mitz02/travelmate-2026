import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paymentLimiter } from '../middleware/rateLimiter';
import { requireIdempotency } from '../middleware/idempotency';
import {
  fundWalletSchema,
  verifyPaymentSchema,
  withdrawWalletSchema,
  transferWalletSchema,
  freezeWalletSchema,
  resolveAccountSchema,
} from '../validators/wallet';
import * as walletController from '../controllers/walletController';

const router = Router();

// Static routes first (before /:userId)
router.get('/me', requireAuth, walletController.getWallet);
router.get('/me/transactions', requireAuth, walletController.getTransactions);
router.get('/me/statistics', requireAuth, walletController.getStatistics);
router.get('/banks', requireAuth, walletController.listBanks);
router.get('/bank-account', requireAuth, walletController.getBankAccount);
router.post('/resolve-account', requireAuth, validate(resolveAccountSchema), walletController.resolveAccount);
router.post('/fund', requireAuth, paymentLimiter, requireIdempotency({ required: false }), validate(fundWalletSchema), walletController.fundWallet);
router.post('/verify-payment', requireAuth, paymentLimiter, requireIdempotency({ required: false }), validate(verifyPaymentSchema), walletController.verifyPayment);
router.post('/withdraw', requireAuth, paymentLimiter, requireIdempotency({ required: true }), validate(withdrawWalletSchema), walletController.withdrawWallet);
router.post('/transfer', requireAuth, paymentLimiter, requireIdempotency({ required: true }), validate(transferWalletSchema), walletController.transferWallet);

// Dynamic routes last
router.get('/:userId/transactions', requireAuth, walletController.getTransactions);
router.get('/:userId/statistics', requireAuth, walletController.getStatistics);
router.post('/:userId/freeze', requireAuth, validate(freezeWalletSchema), walletController.freezeWallet);
router.post('/:userId/unfreeze', requireAuth, walletController.unfreezeWallet);
router.get('/:userId', requireAuth, walletController.getWallet);

export default router;
