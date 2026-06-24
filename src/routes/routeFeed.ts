import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createStatusSchema, addCommentSchema, reactSchema } from '../validators/routeFeed';
import * as routeFeedController from '../controllers/routeFeedController';

const router = Router();

router.post('/', requireAuth, validate(createStatusSchema), routeFeedController.createStatus);
router.get('/', routeFeedController.getFeed);
router.get('/route/:routeId', routeFeedController.getRouteStatuses);
router.get('/:statusId', routeFeedController.getStatus);
router.post('/:statusId/comment', requireAuth, validate(addCommentSchema), routeFeedController.addComment);
router.post('/:statusId/react', requireAuth, validate(reactSchema), routeFeedController.react);
router.delete('/:statusId', requireAuth, routeFeedController.deleteStatus);

export default router;
