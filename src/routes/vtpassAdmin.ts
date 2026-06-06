import { Router, Request, Response } from 'express';
import { getVtpassConfig } from '../config';
import { Plan } from '../models/Plan';
import axios from 'axios';
import { adminMiddleware } from '../middleware/admin';
import { getBardetechPlans } from '../services/bardetech';
import { supabase } from '../services/supabase';
import { getStoredVtpassMode, setStoredVtpassMode } from '../services/vtpassConfig';

// In-memory cache for remote VTpass plans (not saved, just fetched from API)
let remotePlanCache: Plan[] = [];
let bardetechLoaded = false;

async function loadBardetechPlansIfNeeded() {
  if (!bardetechLoaded) {
    const bardetech = await getBardetechPlans();
    remotePlanCache.push(...bardetech);
    bardetechLoaded = true;
  }
}

const router = Router();
// Apply admin authorization to all admin routes
router.use(adminMiddleware);

/**
 * Helper to fetch plans from VTPass for a given service.
 */
async function fetchRemotePlans(serviceId: string): Promise<Plan[]> {
  const cfg = getVtpassConfig();
  const url = `${cfg.baseUrl}/service-variations?serviceID=${serviceId}`;
  const { data } = await axios.get(url, {
    headers: {
      'api-key': cfg.apiKey,
      'secret-key': cfg.secretKey,
    },
  });
  const variations = (data?.content?.variations || []) as any[];
  const tvServices = ['dstv', 'gotv', 'startimes', 'showmax'];
  const resolvedService = serviceId.includes('data') ? 'data' 
    : serviceId.includes('airtime') ? 'airtime' 
    : tvServices.includes(serviceId) ? serviceId 
    : 'bill';
  return variations.map((v) => ({
    id: v.variation_code,
    service: resolvedService,
    name: v.name,
    variation_code: v.variation_code,
    price: Number(v.variation_amount) || 0,
    variation_amount: v.variation_amount,
    network: v.network,
    mode: v.mode,
    volume: v.volume,
    validity: v.validity,
    planType: v.planType,
    sellingPrice: v.sellingPrice,
    apiPrice: v.apiPrice,
    cashbackType: 'fixed',
    cashbackValue: 0,
  }));
}

// ─── Supabase helpers using app_settings table ──────────────────────────────────

export async function loadAllSavedPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'VTPASS_SAVED_PLANS')
    .single();
  
  if (error || !data || !data.value) return [];
  
  try {
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  } catch (e) {
    console.error('Error parsing saved plans from app_settings', e);
    return [];
  }
}

async function saveAllPlansToDb(plans: Plan[]): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from('app_settings')
    .select('key')
    .eq('key', 'VTPASS_SAVED_PLANS')
    .single();

  if (existing) {
    const { error } = await supabase
      .from('app_settings')
      .update({ value: JSON.stringify(plans), updated_at: new Date().toISOString() })
      .eq('key', 'VTPASS_SAVED_PLANS');
    if (error) console.error('Error updating VTPASS_SAVED_PLANS:', error);
  } else {
    // Only insert if there's no row and no selection error other than row not found
    const { error } = await supabase
      .from('app_settings')
      .insert([{ key: 'VTPASS_SAVED_PLANS', value: JSON.stringify(plans), is_public: false }]);
    if (error) console.error('Error inserting VTPASS_SAVED_PLANS:', error);
  }
}

async function getSavedPlans(service: string, apiType?: string): Promise<Plan[]> {
  const allPlans = await loadAllSavedPlans();
  let filtered = allPlans.filter(p => p.service === service);
  if (apiType && apiType !== 'all') {
    filtered = filtered.filter(p => p.apiType === apiType);
  }
  return filtered;
}

// GET /admin/vtpass/plans?service=...&apiType=...&savedOnly=true
router.get('/plans', async (req: Request, res: Response) => {
  const service = req.query.service as string;
  const apiType = (req.query.apiType as string) || 'vtpass';
  const savedOnly = req.query.savedOnly === 'true';
  if (!service) return res.status(400).json({ error: 'service query param required' });

  await loadBardetechPlansIfNeeded();

  try {
    if (savedOnly) {
      const saved = await getSavedPlans(service, apiType);
      return res.json(saved);
    }

    let result: Plan[] = [];
    
    if (apiType === 'bardetech') {
      const bardetechPlans = await getBardetechPlans();
      const filtered = bardetechPlans.filter(p => p.service === service);
      result = filtered;
    } else {
      if (apiType === 'all' || apiType === 'vtpass') {
        // Check remote plan cache first
        let vtpassCached = remotePlanCache.filter(p => p.service === service && p.apiType === 'vtpass');
        if (vtpassCached.length === 0) {
          const remote = await fetchRemotePlans(service);
          remotePlanCache.push(...remote);
          vtpassCached = remote;
        }
        result = [...result, ...vtpassCached];
      }

      if (apiType === 'all') {
        const bardetechPlans = await getBardetechPlans();
        const filtered = bardetechPlans.filter(p => p.service === service);
        const existingCodes = new Set(result.map(p => p.variation_code));
        const toAdd = filtered.filter(p => !existingCodes.has(p.variation_code));
        result = [...result, ...toAdd];
      }
    }

    return res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// PATCH /admin/vtpass/plan/:id – update price (or other fields) of a saved plan
router.patch('/plan/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as Partial<Plan>;

  try {
    const allPlans = await loadAllSavedPlans();
    const planIndex = allPlans.findIndex(p => p.id === id);
    if (planIndex === -1) return res.status(404).json({ error: 'Plan not found' });
    
    allPlans[planIndex] = { ...allPlans[planIndex], ...updates };
    await saveAllPlansToDb(allPlans);
    res.json(allPlans[planIndex]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// PATCH /admin/vtpass/plans/bulk – update fields on multiple plans
router.patch('/plans/bulk', async (req: Request, res: Response) => {
  const { ids, updates } = req.body as { ids: string[], updates: Partial<Plan> };
  if (!ids || !updates) return res.status(400).json({ error: 'ids and updates are required' });

  try {
    const allPlans = await loadAllSavedPlans();
    const updatedPlans: Plan[] = [];
    
    ids.forEach(id => {
      const planIndex = allPlans.findIndex(p => p.id === id);
      if (planIndex !== -1) {
        allPlans[planIndex] = { ...allPlans[planIndex], ...updates };
        updatedPlans.push(allPlans[planIndex]);
      }
    });

    await saveAllPlansToDb(allPlans);
    res.json(updatedPlans);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to bulk update plans' });
  }
});

// POST /admin/vtpass/plans – create or upsert a plan (persisted to Supabase app_settings)
router.post('/plans', async (req: Request, res: Response) => {
  const {
    service,
    name,
    variationCode,
    price,
    apiPrice,
    volume,
    validity,
    planType,
    network,
    mode,
    apiType = 'vtpass'
  } = req.body as any;

  try {
    const allPlans = await loadAllSavedPlans();
    const existingIndex = allPlans.findIndex(p => 
      p.variation_code === variationCode && 
      p.service === service && 
      p.apiType === apiType &&
      (mode ? p.mode === mode : true)
    );

    if (existingIndex !== -1) {
      // Update existing
      const existing = allPlans[existingIndex];
      const updatedPlan = {
        ...existing,
        name: name ?? existing.name,
        price: price ?? existing.price,
        apiPrice: apiPrice ?? existing.apiPrice,
        volume: volume ?? existing.volume,
        validity: validity ?? existing.validity,
        planType: planType ?? existing.planType,
        network: network ?? existing.network,
        mode: mode ?? existing.mode,
        cashbackType: req.body.cashbackType ?? existing.cashbackType,
        cashbackValue: req.body.cashbackValue ?? existing.cashbackValue,
        isSaved: true
      };
      allPlans[existingIndex] = updatedPlan;
      await saveAllPlansToDb(allPlans);
      return res.json(updatedPlan);
    }
    // Create new plan
    let newPlan: Plan;
    if (apiType === 'bardetech') {
      const { planId, networkId, ...rest } = req.body as any;
      const actualPlanId = planId || variationCode; // Handle frontend sending variationCode
      newPlan = {
        id: `${apiType}-${actualPlanId}`,
        service,
        name: name ?? actualPlanId,
        variation_code: actualPlanId,
        externalId: actualPlanId,
        price: rest.price ?? price,
        apiPrice: apiPrice ?? rest.price ?? price,
        volume,
        validity,
        planType,
        network: networkId ?? network,
        mode,
        apiType: 'bardetech',
        cashbackType: req.body.cashbackType ?? 'fixed',
        cashbackValue: req.body.cashbackValue ?? 0,
        isSaved: true,
        ...rest,
      } as Plan;
    } else {
      newPlan = {
        id: `${apiType}-${variationCode}`,
        service,
        name: name ?? variationCode,
        variation_code: variationCode,
        price,
        apiPrice: apiPrice ?? price,
        volume,
        validity,
        planType,
        network,
        mode,
        apiType: apiType,
        cashbackType: req.body.cashbackType ?? 'fixed',
        cashbackValue: req.body.cashbackValue ?? 0,
        isSaved: true,
      } as Plan;
    }
    allPlans.push(newPlan);
    await saveAllPlansToDb(allPlans);
    return res.json(newPlan);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save plan' });
  }
});

// DELETE /admin/vtpass/plans/bardetech – remove all saved Bardetech plans
router.delete('/plans/bardetech', async (req: Request, res: Response) => {
  try {
    const allPlans = await loadAllSavedPlans();
    const beforeCount = allPlans.length;
    const filtered = allPlans.filter(p => p.apiType !== 'bardetech');
    const removed = beforeCount - filtered.length;
    await saveAllPlansToDb(filtered);
    res.json({ removed, remaining: filtered.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete Bardetech plans' });
  }
});

// DELETE /admin/vtpass/plans/:id – delete a single saved plan by its ID
router.delete('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allPlans = await loadAllSavedPlans();
    const beforeCount = allPlans.length;
    const filtered = allPlans.filter(p => p.id !== id);
    const removed = beforeCount - filtered.length;
    if (removed === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    await saveAllPlansToDb(filtered);
    res.json({ removed, remaining: filtered.length, deletedId: id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// DELETE /admin/vtpass/plans – delete plans (optionally by apiType). If apiType query param is provided, deletes only that type; otherwise deletes all saved plans.
router.delete('/plans', async (req: Request, res: Response) => {
  try {
    const apiType = req.query.apiType as string | undefined;
    const allPlans = await loadAllSavedPlans();
    const beforeCount = allPlans.length;
    let filtered: Plan[];
    if (apiType) {
      filtered = allPlans.filter(p => p.apiType !== apiType);
    } else {
      filtered = [];
    }
    const removed = beforeCount - filtered.length;
    await saveAllPlansToDb(filtered);
    res.json({ removed, remaining: filtered.length, deletedApiType: apiType ?? 'all' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete plans' });
  }
});

// GET /admin/vtpass/electricity/mode
router.get('/electricity/mode', async (_req: Request, res: Response) => {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'VTPASS_ELECTRICITY_MODE')
      .single();
    res.json({ mode: data?.value || 'sandbox' });
  } catch (e) {
    res.json({ mode: 'sandbox' });
  }
});

// POST /admin/vtpass/electricity/mode
router.post('/electricity/mode', async (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode !== 'sandbox' && mode !== 'live') return res.status(400).json({ error: 'Invalid mode' });

  try {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', 'VTPASS_ELECTRICITY_MODE')
      .single();

    if (existing) {
      await supabase
        .from('app_settings')
        .update({ value: mode })
        .eq('key', 'VTPASS_ELECTRICITY_MODE');
    } else {
      await supabase
        .from('app_settings')
        .insert([{ key: 'VTPASS_ELECTRICITY_MODE', value: mode, is_public: false }]);
    }
    res.json({ success: true, mode });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update mode' });
  }
});
// GET current VTpass environment (live or sandbox)
router.get('/env', async (_req: Request, res: Response) => {
  try {
    const mode = await getStoredVtpassMode();
    res.json({ env: mode });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get VTpass environment' });
  }
});

// POST to update VTpass environment
router.post('/env', async (req: Request, res: Response) => {
  const { env } = req.body as { env: string };
  if (!env || (env !== 'live' && env !== 'sandbox')) {
    return res.status(400).json({ error: 'Invalid env value' });
  }
  try {
    await setStoredVtpassMode(env);
    res.json({ success: true, env });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to set VTpass environment' });
  }
});

export default router;
