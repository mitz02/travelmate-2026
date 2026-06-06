import express, { Router, Response } from 'express';
import Joi from 'joi';
import { AuthRequest } from '../middleware/auth';
import { geocode, getDirections } from '../services/mapbox';

const router: Router = express.Router();

const searchSchema = Joi.object({
  q: Joi.string().required().min(2),
});

const routeSchema = Joi.object({
  fromLng: Joi.number().required(),
  fromLat: Joi.number().required(),
  toLng: Joi.number().required(),
  toLat: Joi.number().required(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/location/autocomplete?q=...
// Proxy to Mapbox Geocoding API
// ─────────────────────────────────────────────────────────────────────────────
router.get('/autocomplete', async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = searchSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const results = await geocode(value.q as string);
    return res.json({ results });
  } catch (err: any) {
    console.error('Location autocomplete error:', err.message);
    return res.status(500).json({ error: 'Failed to search location' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/location/route?fromLng=...&fromLat=...&toLng=...&toLat=...
// Proxy to Mapbox Directions API
// ─────────────────────────────────────────────────────────────────────────────
router.get('/route', async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = routeSchema.validate(req.query);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const route = await getDirections(
      Number(value.fromLng),
      Number(value.fromLat),
      Number(value.toLng),
      Number(value.toLat)
    );

    if (!route) return res.status(404).json({ error: 'Route not found between these points' });

    return res.json({ route });
  } catch (err: any) {
    console.error('Location route error:', err.message);
    return res.status(500).json({ error: 'Failed to calculate route' });
  }
});

export default router;
