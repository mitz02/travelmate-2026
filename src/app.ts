import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { adminMiddleware } from './middleware/admin.js';
import agoraRoutes from './routes/agora.js';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import bookingRoutes from './routes/booking';
import rideRoutes from './routes/ride';
import paymentRoutes, { paystackWebhookHandler } from './routes/payment';
import kycRoutes from './routes/kyc';
import userRoutes from './routes/user';
import chatRoutes from './routes/chat';
import servicesRoutes from './routes/services';
import locationRoutes from './routes/location';
import adminRoutes from './routes/admin';
import vtpassAdmin from './routes/vtpassAdmin';
import configRoutes from './routes/config';
import './services/notification'; // Initialize Firebase Admin SDK on startup

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cors());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'TravelMate API', timestamp: new Date().toISOString() });
  });

  // ── Swagger UI (no auth required) ──────────────────────────────────────────
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'TravelMate API Docs',
      customCss: '.swagger-ui .topbar { background-color: #1a1a2e; } .swagger-ui .topbar-wrapper img { content: none; } .swagger-ui .topbar-wrapper::before { content: "TravelMate API"; color: #e94560; font-size: 1.4rem; font-weight: 700; }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        defaultModelsExpandDepth: 2,
        docExpansion: 'none',
      },
    }),
  );

  // ── Expose raw OpenAPI JSON ────────────────────────────────────────────────
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Public
  app.use('/api/auth', authRoutes);
  app.use('/api/config', configRoutes);

  // Webhook (no JWT; verified by Paystack signature)
  app.post('/api/payments/webhook/paystack', paystackWebhookHandler);

  // Agora token endpoint
  app.use('/api/agora', authMiddleware, agoraRoutes);
  app.use('/api/bookings', authMiddleware, bookingRoutes);
  app.use('/api/wallet', authMiddleware, walletRoutes);
  app.use('/api/rides', authMiddleware, rideRoutes);
  app.use('/api/payments', authMiddleware, paymentRoutes);
  app.use('/api/kyc', authMiddleware, kycRoutes);
  app.use('/api/user', authMiddleware, userRoutes);
  app.use('/api/chat', authMiddleware, chatRoutes);
  app.use('/api/services', authMiddleware, servicesRoutes);
  app.use('/api/location', authMiddleware, locationRoutes);
  app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
  app.use('/api/admin/vtpass', authMiddleware, adminMiddleware, vtpassAdmin);

  app.use(errorHandler);
  return app;
}
