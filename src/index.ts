import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { requireAuth } from './middleware/auth';
import { supabaseAdmin } from './config/supabase';
import swaggerSpec from './swagger';
import { initSocketServer } from './socket';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import chatRoutes from './routes/chat';
import kycRoutes from './routes/kyc';
import ridesRoutes from './routes/rides';
import bookingsRoutes from './routes/bookings';
import walletRoutes from './routes/wallet';
import escrowRoutes from './routes/escrow';
import paymentsRoutes from './routes/payments';
import webhooksRoutes from './routes/webhooks';
import chatsRoutes from './routes/chats';
import notificationsRoutes from './routes/notifications';
import trackingRoutes from './routes/tracking';
import emergencyRoutes from './routes/emergency';
import searchChatterRoutes from './routes/searchChatter';
import routeFeedRoutes from './routes/routeFeed';
import billsRoutes from './routes/bills';
import ratingsRoutes from './routes/ratings';
import adminRoutes from './routes/admin';
import bardetechAdminRoutes from './routes/bardetechAdmin';
import referralRoutes from './routes/referral';
import promoRoutes from './routes/promo';
import pdfRoutes from './routes/pdf';
import locationRoutes from './routes/location';
import agoraRoutes from './routes/agora';
import callRoutes from './routes/calls';
import servicesRoutes from './routes/services';
import * as userController from './controllers/userController';
import { ensureFirebaseAdmin } from './services/firebase';

ensureFirebaseAdmin();

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/config', async (_req, res) => {
  try {
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .eq('is_public', true);
    const config: Record<string, string> = {};
    if (settings) {
      for (const s of settings) {
        config[s.key] = s.value;
      }
    }
    if (!config.MAPBOX_ACCESS_TOKEN) config.MAPBOX_ACCESS_TOKEN = process.env.VITE_MAPBOX_TOKEN || '';
    res.json(config);
  } catch (e) {
    res.json({ MAPBOX_ACCESS_TOKEN: process.env.VITE_MAPBOX_TOKEN || '' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/kyc', kycRoutes);
app.get('/api/user/activity', requireAuth, userController.getUserActivity);
app.get('/api/user/activity-feed', requireAuth, userController.getUserActivityFeed);

app.use('/api/location', locationRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/search-chatter', searchChatterRoutes);
app.use('/api/route-feed', routeFeedRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/agora', requireAuth, agoraRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/services', requireAuth, servicesRoutes);
app.use('/api/admin/bardetech', requireAuth, bardetechAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/pdf', pdfRoutes);

app.get('/health', async (_req, res) => {
  try {
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1).maybeSingle();
    if (error) {
      const hint =
        error.code === '42P01'
          ? 'Run sql/00_schema.sql on your database to create the profiles table.'
          : 'Check DATABASE_URL (or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) env vars';
      res.status(503).json({ status: 'degraded', error: error.message, hint });
      return;
    }
    res.json({ status: 'ok', database: 'connected' });
  } catch (e) {
    res.status(503).json({
      status: 'error',
      error: e instanceof Error ? e.message : 'Supabase connection failed',
      hint: 'Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env',
    });
  }
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Upload too large. Please reduce file sizes (max 20MB total).' });
    return;
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const httpServer = http.createServer(app);
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: GET http://localhost:${PORT}/health`);
});
