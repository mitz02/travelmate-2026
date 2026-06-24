import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as callController from '../controllers/callController';

const router = Router();

router.post('/initiate', requireAuth, callController.initiateCall);
router.get('/incoming', requireAuth, callController.getIncomingCalls);
router.put('/:id/accept', requireAuth, callController.acceptCall);
router.put('/:id/reject', requireAuth, callController.rejectCall);
router.put('/:id/end', requireAuth, callController.endCall);
router.get('/history', requireAuth, callController.getCallHistory);

export default router;
