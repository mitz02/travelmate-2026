import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRequestSchema, makeOfferSchema } from '../validators/searchChatter';
import * as searchChatterController from '../controllers/searchChatterController';

const router = Router();

router.post('/requests', requireAuth, validate(createRequestSchema), searchChatterController.createRequest);
router.get('/requests', searchChatterController.getActiveRequests);
router.post('/requests/:requestId/offers', requireAuth, validate(makeOfferSchema), searchChatterController.makeOffer);
router.get('/requests/:requestId/offers', searchChatterController.getOffers);
router.put('/offers/:offerId/accept', requireAuth, searchChatterController.acceptOffer);
router.put('/offers/:offerId/reject', requireAuth, searchChatterController.rejectOffer);
router.delete('/requests/:requestId', requireAuth, searchChatterController.deleteRequest);

export default router;
