import express, { Router, Response } from 'express';
import { supabase } from '../services/supabase';

const router: Router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/config
// Returns public application settings (e.g. Mapbox token)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (_req, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('is_public', true);

    if (error) {
      // In case the table doesn't exist yet, gracefully return empty config
      if (error.code === '42P01') {
        return res.json({});
      }
      throw error;
    }

    const configMap: Record<string, string> = {};
    settings?.forEach(s => {
      configMap[s.key] = s.value;
    });

    // Include Agora App ID from environment if present
    if (process.env.AGORA_APP_ID) {
      configMap['AGORA_APP_ID'] = process.env.AGORA_APP_ID;
    }

    return res.json(configMap);
  } catch (err) {
    console.error('Config fetch error:', err);
    // Don't fail the whole app if config fails, just return empty so it falls back to .env
    return res.status(200).json({});
  }
});

export default router;
