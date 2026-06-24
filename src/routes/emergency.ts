import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sosSchema, addContactSchema, updateContactSchema } from '../validators/emergency';
import * as emergencyController from '../controllers/emergencyController';

const router = Router();

router.post('/sos', validate(sosSchema), emergencyController.triggerSos);
router.get('/contacts/:userId', requireAuth, emergencyController.getEmergencyContacts);
router.post('/contacts', requireAuth, validate(addContactSchema), emergencyController.addContact);
router.put('/contacts/:contactId', requireAuth, validate(updateContactSchema), emergencyController.updateContact);
router.delete('/contacts/:contactId', requireAuth, emergencyController.deleteContact);
router.post('/:alertId/cancel', requireAuth, emergencyController.cancelSos);
router.get('/:alertId/status', requireAuth, emergencyController.getAlertStatus);

export default router;
