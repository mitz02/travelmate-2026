import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as pdfController from '../controllers/pdfController';

const router = Router();

router.get('/export/:type', requireAuth, pdfController.exportPdf);

export default router;
