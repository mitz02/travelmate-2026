import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  holdEscrowSchema,
  releaseEscrowSchema,
  refundEscrowSchema,
  disputeEscrowSchema,
  resolveEscrowSchema,
} from '../validators/escrow';
import * as escrowController from '../controllers/escrowController';

const router = Router();

router.post('/hold', requireAuth, validate(holdEscrowSchema), escrowController.holdFunds);
router.get('/booking/:bookingId', requireAuth, escrowController.getEscrowByBooking);
router.get('/user/:userId', requireAuth, escrowController.getUserEscrows);
router.get('/admin/pending-disputes', requireAuth, requireAdmin, escrowController.adminListPendingDisputes);
router.get('/:escrowId/status', requireAuth, escrowController.getEscrowStatus);
router.post('/:escrowId/release', requireAuth, validate(releaseEscrowSchema), escrowController.releaseFunds);
router.post('/:escrowId/refund', requireAuth, validate(refundEscrowSchema), escrowController.refundFunds);
router.post('/:escrowId/dispute', requireAuth, validate(disputeEscrowSchema), escrowController.raiseDispute);
router.post('/:escrowId/resolve', requireAuth, requireAdmin, validate(resolveEscrowSchema), escrowController.resolveEscrow);

export default router;
